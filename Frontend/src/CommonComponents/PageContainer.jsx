const PageContainer = ({ children, className = "" }) => {
  return (
    <div
      className={`w-full max-w-[1700px] mx-auto px-[6%] sm:px-[5%] lg:px-[3%] ${className}`}
    >
      {children}
    </div>
  );
};

export default PageContainer;