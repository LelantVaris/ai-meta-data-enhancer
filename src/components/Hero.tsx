
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <motion.div 
      className="text-center mb-12 mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.h1 
        className="text-4xl md:text-5xl font-medium tracking-tight text-neutral-900 mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        Meta Tweak Creator
      </motion.h1>
      <motion.p 
        className="text-neutral-600 text-lg max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        Upload your CSV with meta titles and descriptions. We'll optimize them based on character limits.
      </motion.p>
    </motion.div>
  );
};

export default Hero;
