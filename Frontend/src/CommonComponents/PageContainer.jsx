const PageContainer = ({ children, className = "" }) => {
  return (
    <div
      className={`mx-auto w-full max-w-[1500px] px-[6%] sm:px-[5%] lg:px-[3%] ${className}`}
    >
      {children}
    </div>
  );
};

export default PageContainer;