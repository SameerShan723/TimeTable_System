/* eslint-disable @typescript-eslint/no-explicit-any */
import { Days, Rooms as DefaultRooms, LabRooms as DefaultLabRooms, RegularRooms as DefaultRegularRooms, timeSlots } from "@/helpers/page";
import type { TimetableData, RoomSchedule, Session, EmptySlot } from "@/app/timetable/types";

export type ClassType = "Theory" | "Lab";

export interface CourseInput {
	id: string | number;
	course_details: string | null;
	faculty_assigned: string | null;
	section: string | null;
	credit_hour: number | null;
	theory_classes_week: number | null;
	lab_classes_week: number | null;
	subject_type?: string | null;
	is_regular_teacher?: boolean | null;
}

export interface RoomInput {
	id: string;
	name: string;
	type: "Regular" | "Lab";
	capacity?: number;
}

export interface SchedulerOptions {
	courses: CourseInput[];
	rooms?: RoomInput[]; // falls back to defaults if omitted
	maxClassesPerTeacherPerDay?: number; // default 4
	maxClassesPerSectionPerDay?: number; // default 6
	visitingEarliestTime?: string; // earliest slot for non-regular teachers, e.g., "11:30-12:30"
	teacherAvailability?: Record<string, {
		days?: string[];
		timeSlots?: string[];
		earliestTime?: string;
		latestTime?: string;
	}>;
	// Added: randomness control
	randomSeed?: number | string; // if omitted, a time-based seed will be used
}

interface ClassUnit {
	teacher: string;
	subject: string;
	section: string;
	courseId?: string | number;
	type: ClassType;
	durationSlots: number; // number of 1-hour contiguous slots (1 for theory, often 2 for lab)
	isRegularTeacher: boolean;
}

interface ScheduleResult {
	timetable: TimetableData;
	unscheduled: ClassUnit[];
	stats: {
		totalUnits: number;
		scheduled: number;
		unscheduled: number;
	};
}

// ----- RNG Utilities -----
function hashStringToInt(str: string): number {
	let h = 2166136261 >>> 0; // FNV-1a base
	for (let i = 0; i < str.length; i += 1) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function mulberry32(seed: number) {
	let t = seed >>> 0;
	return function rng() {
		t += 0x6D2B79F5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function createRng(seed: number | string | undefined): () => number {
	if (typeof seed === "number") return mulberry32(seed);
	if (typeof seed === "string") return mulberry32(hashStringToInt(seed));
	// default: time-based seed to vary each generation
	return mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function normalizeString(value: unknown, fallback = "Unknown"): string {
	if (!value || typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

function buildClassUnits(courses: CourseInput[]): ClassUnit[] {
	const units: ClassUnit[] = [];
	for (const c of courses) {
		const teacher = normalizeString(c.faculty_assigned, "No Faculty");
		const subject = normalizeString(c.course_details, "Unknown Course");
		const section = normalizeString(c.section, "");

		const isRegularTeacher = c.is_regular_teacher === true; // only explicit true counts as regular
		const theoryCount = typeof c.theory_classes_week === "number" && c.theory_classes_week !== null
			? c.theory_classes_week
			: typeof c.credit_hour === "number" && c.credit_hour !== null
				? c.credit_hour
				: 0;
		const labCount = typeof c.lab_classes_week === "number" && c.lab_classes_week !== null ? c.lab_classes_week : 0;


		// Theory: schedule as 1-hour sessions based on theoryCount
		for (let i = 0; i < theoryCount; i += 1) {
			units.push({ teacher, subject, section, courseId: c.id, type: "Theory", durationSlots: 1, isRegularTeacher });
		}

		// Lab: treat labCount as total 1-hour slots per week.
		// Prefer 2-hour contiguous blocks when possible.
		const twoHourBlocks = Math.floor(labCount / 2);
		const remainder = labCount % 2;
		for (let i = 0; i < twoHourBlocks; i += 1) {
			units.push({ teacher, subject, section, courseId: c.id, type: "Lab", durationSlots: 2, isRegularTeacher });
		}
		if (remainder === 1) {
			units.push({ teacher, subject, section, courseId: c.id, type: "Lab", durationSlots: 1, isRegularTeacher });
		}
	}
	return units;
}

function initEmptyTimetable(roomNames: string[]): TimetableData {
	const data: TimetableData = {
		Monday: [],
		Tuesday: [],
		Wednesday: [],
		Thursday: [],
		Friday: [],
	};
	for (const day of Days) {
		const dayRooms: RoomSchedule[] = roomNames.map((roomName) => ({
			[roomName]: timeSlots.map((t) => ({ Time: t } as EmptySlot)),
		}));
		(data as any)[day] = dayRooms;
	}
	return data;
}

function getRoomNamesByType(rooms?: RoomInput[]): { regular: string[]; lab: string[]; all: string[] } {
	if (rooms && rooms.length > 0) {
		const regular = rooms.filter((r) => r.type === "Regular").map((r) => r.name);
		const lab = rooms.filter((r) => r.type === "Lab").map((r) => r.name);
		const all = rooms.map((r) => r.name);
		return { regular, lab, all };
	}
	// fallback to defaults
	return { regular: DefaultRegularRooms, lab: DefaultLabRooms, all: DefaultRooms };
}

function sortUnitsByConstraint(units: ClassUnit[], rng: () => number): ClassUnit[] {
	// Heuristic: Labs first, then subjects/teachers with higher weekly demand
	const demandByTeacher = new Map<string, number>();
	const demandBySection = new Map<string, number>();
	const demandBySubject = new Map<string, number>();
	for (const u of units) {
		demandByTeacher.set(u.teacher, (demandByTeacher.get(u.teacher) || 0) + 1);
		demandBySection.set(u.section, (demandBySection.get(u.section) || 0) + 1);
		demandBySubject.set(u.subject, (demandBySubject.get(u.subject) || 0) + 1);
	}
	return [...units].sort((a, b) => {
		if (a.type !== b.type) return a.type === "Lab" ? -1 : 1;
		const tDiff = (demandByTeacher.get(b.teacher) || 0) - (demandByTeacher.get(a.teacher) || 0);
		if (tDiff !== 0) return tDiff;
		const sDiff = (demandBySection.get(b.section) || 0) - (demandBySection.get(a.section) || 0);
		if (sDiff !== 0) return sDiff;
		const subDiff = (demandBySubject.get(b.subject) || 0) - (demandBySubject.get(a.subject) || 0);
		if (subDiff !== 0) return subDiff;
		// Random tie-break among equals to vary final order between runs
		return rng() < 0.5 ? -1 : 1;
	});
}

export function generateDeterministicTimetable(options: SchedulerOptions): ScheduleResult {
	const maxTeacherPerDay = options.maxClassesPerTeacherPerDay ?? 4;
	const maxSectionPerDay = options.maxClassesPerSectionPerDay ?? 6;
	const { regular, lab, all } = getRoomNamesByType(options.rooms);

	// Create RNG
	const rng = createRng(options.randomSeed);

	const timetable = initEmptyTimetable(all);

	// Index to quickly access room arrays per day
	const dayRoomIndex: Record<string, Record<string, (Session | EmptySlot)[]>> = {};
	for (const day of Days) {
		const dayMap: Record<string, (Session | EmptySlot)[]> = {};
		for (const roomSchedule of (timetable as any)[day] as RoomSchedule[]) {
			const roomName = Object.keys(roomSchedule)[0];
			dayMap[roomName] = roomSchedule[roomName];
		}
		dayRoomIndex[day] = dayMap;
	}

	// Tracking maps
	const teacherDailyCount = new Map<string, Map<string, number>>(); // teacher -> day -> count
	const sectionDailyCount = new Map<string, Map<string, number>>(); // section -> day -> count
	const teacherBusy = new Map<string, Set<string>>(); // teacher -> set of day|time
	const sectionBusy = new Map<string, Set<string>>(); // section -> set of day|time
	const subjectTimeBusy = new Map<string, Set<string>>(); // subject|section -> set of day|time
	const subjectDailyCount = new Map<string, Map<string, number>>(); // subject|section -> day -> count

	// Normalize teacher availability for case-insensitive matching
	const availabilityMap = new Map<string, {
		days?: string[];
		timeSlots?: string[];
		earliestTime?: string;
		latestTime?: string;
	}>();
	if (options.teacherAvailability) {
		for (const [name, cfg] of Object.entries(options.teacherAvailability)) {
			availabilityMap.set(name.toLowerCase(), cfg);
		}
	}

	function inc(map: Map<string, Map<string, number>>, key: string, day: string) {
		if (!map.has(key)) map.set(key, new Map());
		const m = map.get(key)!;
		m.set(day, (m.get(day) || 0) + 1);
	}
	function getCount(map: Map<string, Map<string, number>>, key: string, day: string): number {
		return map.get(key)?.get(day) || 0;
	}
	function markBusy(m: Map<string, Set<string>>, key: string, token: string) {
		if (!m.has(key)) m.set(key, new Set());
		m.get(key)!.add(token);
	}
	function isBusy(m: Map<string, Set<string>>, key: string, token: string): boolean {
		return m.get(key)?.has(token) || false;
	}

	const rawUnits = buildClassUnits(options.courses);
	const units = sortUnitsByConstraint(rawUnits, rng);

	const unscheduled: ClassUnit[] = [];

	// Helper to choose target day order to balance teacher/section loads with random tie-breaks
	function preferredDaysFor(unit: ClassUnit): string[] {
		// Sort days by combined (teacher + section + subject) count ascending; randomize ties
		return [...Days].sort((d1, d2) => {
			const subjKey = `${unit.subject}__${unit.section}`;
			const c1 = getCount(teacherDailyCount, unit.teacher, d1)
				+ getCount(sectionDailyCount, unit.section, d1)
				+ getCount(subjectDailyCount, subjKey, d1);
			const c2 = getCount(teacherDailyCount, unit.teacher, d2)
				+ getCount(sectionDailyCount, unit.section, d2)
				+ getCount(subjectDailyCount, subjKey, d2);
			if (c1 !== c2) return c1 - c2;
			// randomize ties
			return rng() < 0.5 ? -1 : 1;
		});
	}

	const visitingEarliestIndex = (() => {
		if (!options.visitingEarliestTime) return timeSlots.indexOf("11:30-12:30");
		const idx = timeSlots.indexOf(options.visitingEarliestTime);
		return idx === -1 ? timeSlots.indexOf("11:30-12:30") : idx;
	})();

	for (const unit of units) {
		let placed = false;
		let candidateDays = preferredDaysFor(unit);
		const avail = availabilityMap.get(unit.teacher.toLowerCase());
		if (avail?.days && Array.isArray(avail.days) && avail.days.length > 0) {
			const daysSet = new Set(avail.days);
			candidateDays = candidateDays.filter((d) => daysSet.has(d));
			if (candidateDays.length === 0) {
				// no allowed days → cannot schedule
				unscheduled.push(unit);
				continue;
			}
		}
		// Phase 1: prefer days where this subject-section hasn't been scheduled yet
		const subjKey = `${unit.subject}__${unit.section}`;
		const daysNoSubjYet = candidateDays.filter((d) => getCount(subjectDailyCount, subjKey, d) === 0);
		const daysAllowRepeat = candidateDays.filter((d) => getCount(subjectDailyCount, subjKey, d) > 0);

		for (const day of [...daysNoSubjYet, ...daysAllowRepeat]) {
			// Enforce daily limits
			if (getCount(teacherDailyCount, unit.teacher, day) >= maxTeacherPerDay) continue;
			if (getCount(sectionDailyCount, unit.section, day) >= maxSectionPerDay) continue;

			// Build time preferences with rule: non-regular teachers after 11:30
			const afterMin = timeSlots.slice(Math.max(0, visitingEarliestIndex));
			const beforeMin = timeSlots.slice(0, Math.max(0, visitingEarliestIndex));
			// Build allowed times from availability if provided
			let allowedTimes: string[] | null = null;
			if (avail) {
				if (avail.timeSlots && avail.timeSlots.length > 0) {
					allowedTimes = avail.timeSlots.filter((t) => timeSlots.includes(t));
				} else {
					const startIdx = avail.earliestTime ? Math.max(0, timeSlots.indexOf(avail.earliestTime)) : 0;
					const endIdx = avail.latestTime ? timeSlots.indexOf(avail.latestTime) : timeSlots.length - 1;
					const s = startIdx === -1 ? 0 : startIdx;
					const e = endIdx === -1 ? timeSlots.length - 1 : endIdx;
					allowedTimes = timeSlots.slice(Math.min(s, e), Math.max(s, e) + 1);
				}
			}

			const timePreferenceBase = allowedTimes
				? [...allowedTimes]
				: unit.isRegularTeacher
					? [...timeSlots]
					: [...afterMin, ...beforeMin];

			// Randomize time order within allowed preference to produce variety
			const times = shuffleInPlace([...timePreferenceBase], rng);

			for (const time of times) {
				// For duration > 1, we need contiguous slots
				const startIndex = timeSlots.indexOf(time);
				if (startIndex === -1) continue;
				if (startIndex + unit.durationSlots > timeSlots.length) continue; // not enough contiguous slots

				// Build tokens for all slots in block
				const blockTimes = timeSlots.slice(startIndex, startIndex + unit.durationSlots);
				const tokens = blockTimes.map((t) => `${day}|${t}`);

				// Check teacher/section/subject-time availability across the whole block
				if (tokens.some((tok) => isBusy(teacherBusy, unit.teacher, tok))) continue;
				if (unit.section && tokens.some((tok) => isBusy(sectionBusy, unit.section, tok))) continue;
				if (tokens.some((tok) => isBusy(subjectTimeBusy, subjKey, tok))) continue;

				// choose room list by type
				const roomList = unit.type === "Lab" ? lab : [...regular, ...lab];
				// Strict rule: labs only in lab rooms. If none configured, skip.
				const roomsToTry = unit.type === "Lab"
					? (lab.length > 0 ? lab : [])
					: roomList.length > 0 ? roomList : all;
				if (roomsToTry.length === 0) continue;

				// Prefer rooms with fewer existing classes that day (to spread usage), randomize ties
				const sortedRooms = [...roomsToTry].sort((r1, r2) => {
					const v1 = (dayRoomIndex[day][r1] || []).filter((s) => (s as any).Teacher).length;
					const v2 = (dayRoomIndex[day][r2] || []).filter((s) => (s as any).Teacher).length;
					if (v1 !== v2) return v1 - v2;
					return rng() < 0.5 ? -1 : 1;
				});

				for (const room of sortedRooms) {
					const sessions = dayRoomIndex[day][room];
					if (!sessions) continue; // skip rooms not in schedule

					// Ensure all block times are free in this room
					const indices = blockTimes.map((t) => sessions.findIndex((s) => s.Time === t));
					if (indices.some((i) => i === -1)) continue;
					const occupied = indices.some((i) => (sessions[i] as any).Teacher);
					if (occupied) continue;

					// Place the session(s)
					indices.forEach((i, bi) => {
						const session: Session = {
							Time: blockTimes[bi],
							Room: room,
							Teacher: unit.teacher,
							Subject: unit.subject,
							Section: unit.section || undefined,
							Type: unit.type,
							CourseId: unit.courseId,
						};
						sessions[i] = session;
					});

					// Update trackers once per block
					inc(teacherDailyCount, unit.teacher, day);
					if (unit.section) inc(sectionDailyCount, unit.section, day);
					inc(subjectDailyCount, subjKey, day);
					tokens.forEach((tok) => {
						markBusy(teacherBusy, unit.teacher, tok);
						if (unit.section) markBusy(sectionBusy, unit.section, tok);
						markBusy(subjectTimeBusy, subjKey, tok);
					});
					placed = true;
					break;
				}
				if (placed) break;
			}
			if (placed) break;
		}
		if (!placed) unscheduled.push(unit);
	}

	const scheduledCount = rawUnits.length - unscheduled.length;
	return {
		timetable,
		unscheduled,
		stats: {
			totalUnits: rawUnits.length,
			scheduled: scheduledCount,
			unscheduled: unscheduled.length,
		},
	};
}


