
import React from "react";
import ReactSelectLib, { Props as ReactSelectProps, StylesConfig } from "react-select";



interface Option {
  value: string | number;
  label: string;
}

export interface ReactSelectComponentProps<T extends Option = Option, IsMulti extends boolean = false> 
  extends Omit<ReactSelectProps<T, IsMulti>, 'styles'> {
  variant?: 'default' | 'dark' | 'compact';
  customStyles?: StylesConfig<T, IsMulti>;
  size?: 'sm' | 'md' | 'lg';
}

const getSizeStyles = (size: 'sm' | 'md' | 'lg') => {
  const sizeConfig = {
    sm: { minHeight: "36px", fontSize: "0.75rem" },
    md: { minHeight: "48px", fontSize: "0.875rem" },
    lg: { minHeight: "56px", fontSize: "1rem" }
  };
  return sizeConfig[size];
};

const defaultStyles = <T extends Option, IsMulti extends boolean>(size: 'sm' | 'md' | 'lg' = 'md'): StylesConfig<T, IsMulti> => {
  const sizeStyles = getSizeStyles(size);
  
  return {
    control: (base, state) => ({
      ...base,
      width: "100%",
      backgroundColor: "#f9fafb",
      border: state.isFocused
        ? "2px solid #3b82f6"
        : "1px solid #e5e7eb",
      borderRadius: "0.5rem",
      minHeight: sizeStyles.minHeight,
      boxShadow: state.isFocused
        ? "0 0 0 2px rgba(59, 130, 246, 0.1)"
        : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        borderColor: "#3b82f6",
      },
      color: "#111827",
      transition: "all 0.2s",
      fontSize: sizeStyles.fontSize,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
      fontSize: sizeStyles.fontSize,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#e5e7eb",
      borderRadius: "0.375rem",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#111827",
      fontSize: sizeStyles.fontSize,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#6b7280",
      "&:hover": {
        backgroundColor: "#f87171",
        color: "#ffffff",
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#ffffff",
      color: "#111827",
      fontSize: sizeStyles.fontSize,
      borderRadius: "0.5rem",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#3b82f6"
        : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
      transition: "all 0.2s",
      fontSize: sizeStyles.fontSize,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#6b7280",
      fontSize: sizeStyles.fontSize,
    }),
    input: (base) => ({
      ...base,
      color: "#111827",
      fontSize: sizeStyles.fontSize,
    }),
  };
};

const darkStyles = <T extends Option, IsMulti extends boolean>(size: 'sm' | 'md' | 'lg' = 'md'): StylesConfig<T, IsMulti> => {
  const sizeStyles = getSizeStyles(size);
  
  return {
    control: (base, state) => ({
      ...base,
      width: "100%",
      backgroundColor: "#374151",
      border: state.isFocused
        ? "2px solid #60a5fa"
        : "1px solid #4b5563",
      borderRadius: "0.5rem",
      minHeight: sizeStyles.minHeight,
      boxShadow: state.isFocused
        ? "0 0 0 2px rgba(96, 165, 250, 0.1)"
        : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "&:hover": {
        borderColor: "#60a5fa",
      },
      color: "#f9fafb",
      transition: "all 0.2s",
      fontSize: sizeStyles.fontSize,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#f9fafb",
      fontSize: sizeStyles.fontSize,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#4b5563",
      borderRadius: "0.375rem",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#f9fafb",
      fontSize: sizeStyles.fontSize,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#9ca3af",
      "&:hover": {
        backgroundColor: "#ef4444",
        color: "#ffffff",
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#374151",
      color: "#f9fafb",
      fontSize: sizeStyles.fontSize,
      borderRadius: "0.5rem",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#60a5fa"
        : state.isFocused
        ? "#4b5563"
        : "#374151",
      transition: "all 0.2s",
      fontSize: sizeStyles.fontSize,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
      fontSize: sizeStyles.fontSize,
    }),
    input: (base) => ({
      ...base,
      color: "#f9fafb",
      fontSize: sizeStyles.fontSize,
    }),
  };
};

const compactStyles = <T extends Option, IsMulti extends boolean>(size: 'sm' | 'md' | 'lg' = 'md'): StylesConfig<T, IsMulti> => {
  const sizeStyles = getSizeStyles(size);
  
  return {
    control: (base, state) => ({
      ...base,
      width: "100%",
      backgroundColor: "#ffffff",
      border: state.isFocused
        ? "1px solid #3b82f6"
        : "1px solid #d1d5db",
      borderRadius: "0.375rem",
      minHeight: sizeStyles.minHeight,
      boxShadow: "none",
      "&:hover": {
        borderColor: "#3b82f6",
      },
      color: "#111827",
      transition: "all 0.2s",
      fontSize: sizeStyles.fontSize,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
      fontSize: sizeStyles.fontSize,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#f3f4f6",
      borderRadius: "0.25rem",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#111827",
      fontSize: sizeStyles.fontSize,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#6b7280",
      "&:hover": {
        backgroundColor: "#f87171",
        color: "#ffffff",
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#ffffff",
      color: "#111827",
      fontSize: sizeStyles.fontSize,
      borderRadius: "0.375rem",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#3b82f6"
        : state.isFocused
        ? "#f3f4f6"
        : "#ffffff",
      transition: "all 0.2s",
      fontSize: sizeStyles.fontSize,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
      fontSize: sizeStyles.fontSize,
    }),
    input: (base) => ({
      ...base,
      color: "#111827",
      fontSize: sizeStyles.fontSize,
    }),
  };
};

function ReactSelect<T extends Option = Option, IsMulti extends boolean = false>({
  variant = 'default',
  size = 'md',
  customStyles,
  ...props
}: ReactSelectComponentProps<T, IsMulti>) {
  const getBaseStyles = () => {
    switch (variant) {
      case 'dark':
        return darkStyles<T, IsMulti>(size);
      case 'compact':
        return compactStyles<T, IsMulti>(size);
      default:
        return defaultStyles<T, IsMulti>(size);
    }
  };

  const baseStyles = getBaseStyles();
  const styles = customStyles 
    ? { ...baseStyles, ...customStyles } 
    : baseStyles;

  return (
    <ReactSelectLib
      styles={styles}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as unknown as any)}  
    />
  );
}

export { ReactSelect };
export default ReactSelect;
