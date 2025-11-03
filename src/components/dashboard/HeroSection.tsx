"use client";

export default function HeroSection() {
  return (
    <section className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 border border-[#232323] rounded-[20px] bg-[#050505] overflow-hidden">
      <div className="relative z-10 flex flex-col gap-4 max-w-[600px]">
        <h1 className="text-3xl sm:text-4xl font-normal text-[#F5F5F5]">
          Deploy AI Agents to your apps instantly.
        </h1>
        <p className="text-base text-[#C1C1C1] leading-6">
          Launch your AI project into orbit with our instant training platform.
          We use the latest AI technology to help you train your model quickly
          and efficiently.
        </p>
      </div>

      <div className="absolute sm:right-0 sm:top-3/4 sm:-translate-y-1/2 opacity-60 mix-blend-luminosity hidden sm:block">
        <img
          src="/rocket.svg"
          alt="AI background"
          className="w-[300px] sm:w-[460px]"
        />
      </div>
    </section>
  );
}
