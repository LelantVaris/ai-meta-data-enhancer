
import { useState } from "react";
import MetaEnhancer from "@/components/MetaEnhancer";
import Hero from "@/components/Hero";

const Index = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-12">
        <Hero />
        <MetaEnhancer />
      </main>
    </div>
  );
};

export default Index;
