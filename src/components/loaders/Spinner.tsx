const SpinnerLoader = () => {
  return (
    <div className="w-10 h-10 flex items-center justify-center">
      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default SpinnerLoader;
