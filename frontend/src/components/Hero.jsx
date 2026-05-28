import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const TypewriterPlaceholder = ({ text, active, delay = 60 }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    if (!active) {
      setDisplayedText("");
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay, active]);

  return displayedText;
};

const useRotatingTypewriter = ({
  phrases,
  typeDelayMs = 55,
  deleteDelayMs = 18,
  pauseAfterTypedMs = 1100,
  pauseAfterDeletedMs = 250
}) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [mode, setMode] = useState('typing'); // typing | pausing | deleting | reset

  const phrase = phrases[phraseIndex] || '';

  useEffect(() => {
    if (!phrases?.length) return;

    if (mode === 'typing') {
      if (charIndex >= phrase.length) {
        const t = setTimeout(() => setMode('pausing'), pauseAfterTypedMs);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setCharIndex((c) => c + 1), typeDelayMs);
      return () => clearTimeout(t);
    }

    if (mode === 'pausing') {
      const t = setTimeout(() => setMode('deleting'), 0);
      return () => clearTimeout(t);
    }

    if (mode === 'deleting') {
      if (charIndex <= 0) {
        const t = setTimeout(() => setMode('reset'), pauseAfterDeletedMs);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setCharIndex((c) => c - 1), deleteDelayMs);
      return () => clearTimeout(t);
    }

    if (mode === 'reset') {
      const t = setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setMode('typing');
      }, 0);
      return () => clearTimeout(t);
    }
  }, [
    phrases,
    phrase,
    phraseIndex,
    charIndex,
    mode,
    typeDelayMs,
    deleteDelayMs,
    pauseAfterTypedMs,
    pauseAfterDeletedMs
  ]);

  const text = phrase.slice(0, charIndex);
  return { text, phrase };
};

const Hero = () => {
  const { sendOtp, openAuth } = useContext(AuthContext);
  const [state, setState] = useState('button'); // 'button', 'form', 'submitted'
  const [email, setEmail] = useState('');
  const phrases = [
    'Next Generation of Care Management',
    'Smarter Insurance Claim Processing',
    'Secure Healthcare Automation',
    'Intelligent Fraud Detection',
    'Real-Time Claim Monitoring'
  ];
  const maxPhraseLen = phrases.reduce((m, p) => Math.max(m, p.length), 0);
  const { text: rotatingText } = useRotatingTypewriter({ phrases });

  useEffect(() => {
    if (state === 'submitted') {
      const timer = setTimeout(() => {
        setState('button');
        setEmail('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email) {
      const res = await sendOtp(email);
      if (res.success) {
        openAuth('signup-otp', email);
        setState('submitted');
      }
    }
  };

  const placeholderText = state === 'submitted' 
    ? "Check Your Inbox For The Security Token" 
    : "Enter Your Email Here For Early Access";

  const displayedPlaceholder = TypewriterPlaceholder({ 
    text: placeholderText, 
    active: state !== 'button' 
  });

  return (
    <section className="relative flex-1 flex flex-col items-center justify-center px-6">
      <div className="relative z-10 text-center max-w-5xl mx-auto flex flex-col items-center justify-center w-full gap-12">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-[10px] md:text-[11px] font-medium tracking-[0.2em] uppercase mb-4"
          >
            INTELLIGENT CLAIMS & FRAUD DETECTION
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'Instrument Serif', serif" }}
            className="text-4xl md:text-[64px] font-medium tracking-[-0.01em] leading-[1.1] mb-6 bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent max-w-4xl"
          >
            <span
              className="inline-flex align-top justify-start text-left whitespace-nowrap"
              style={{ minWidth: `${maxPhraseLen}ch` }}
              aria-label={phrases[0]}
            >
              {rotatingText}
              <span className="inline-block w-[1px] h-[0.9em] bg-white/40 align-[-0.08em] ml-1 animate-pulse" />
            </span>
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="min-h-[50px] mt-2 w-full flex justify-center"
        >
          <AnimatePresence mode="wait">
            {state === 'button' ? (
              <motion.button
                key="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setState('form')}
                className="px-10 py-3 text-[14px] font-medium border border-white/10 rounded-full hover:border-white/30 hover:bg-white/[0.02] transition-all duration-300 text-white/90 backdrop-blur-sm cursor-pointer"
              >
                Get early access
              </motion.button>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="flex items-center gap-2 pl-5 pr-1.5 py-1.5 text-[14px] font-medium border border-white/20 rounded-full bg-white/[0.02] backdrop-blur-sm w-full max-w-[400px] focus-within:border-white/40 transition-colors duration-300"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={displayedPlaceholder}
                  autoFocus
                  className="bg-transparent border-none outline-none text-white w-full placeholder-white/45"
                  disabled={state === 'submitted'}
                />
                <button
                  type="submit"
                  className="p-2 bg-white rounded-full text-black hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center shrink-0"
                  disabled={state === 'submitted'}
                >
                  {state === 'submitted' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <a
            href="#"
            className="text-white/80 hover:text-white/40 transition-colors duration-300 text-[13px] font-medium tracking-wide"
          >
            Play Video Demo
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
