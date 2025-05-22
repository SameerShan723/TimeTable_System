const SpinnerLoader = () => {
  return (
    <div className="bg-white w-4 h-4 relative">
      <div className="spinner w-4 h-4 relative">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 left-1/2 w-1 h-2 bg-blue-800 rounded origin-bottom"
            style={{
              transform: `rotate(${i * 53}deg) translateY(-25%)`,
              animation: "fade 1s linear infinite",
              animationDelay: `${i * 0.1}s`,
              opacity: 0.2,
            }}
          ></div>
        ))}
      </div>
      <style jsx>{`
        @keyframes fade {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
};
export default SpinnerLoader;
