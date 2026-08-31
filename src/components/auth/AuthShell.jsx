export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg px-4 pt-8 pb-16">
      <div className="w-full max-w-sm my-auto">
        <div className="text-center mb-8 pt-4">
          <img src="/huniOne.svg" alt="HuniOne" className="h-32 md:h-48 w-auto object-contain mx-auto" />
          <p className="text-sm font-medium text-brand-primary/70 tracking-wide mt-1">
            Platform Properti Terpercaya
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
