import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, BarChart3, Lock } from 'lucide-react';

const services = [
  {
    title: "Fraud Detection",
    description: "Real-time heuristic analysis and risk assessment for every claim.",
    icon: Shield,
    color: "from-blue-500/20 to-blue-600/20",
    border: "border-blue-500/30"
  },
  {
    title: "Instant Processing",
    description: "Automated workflow engine for lightning-fast claim evaluations.",
    icon: Zap,
    color: "from-emerald-500/20 to-emerald-600/20",
    border: "border-emerald-500/30"
  },
  {
    title: "Data Insights",
    description: "Comprehensive telemetry and operational metrics at your fingertips.",
    icon: BarChart3,
    color: "from-amber-500/20 to-amber-600/20",
    border: "border-amber-500/30"
  },
  {
    title: "Secure Node",
    description: "Enterprise-grade security for sensitive Care Zone health and insurance data.",
    icon: Lock,
    color: "from-purple-500/20 to-purple-600/20",
    border: "border-purple-500/30"
  }
];

const Services = () => {
  return (
    <section id="services" className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 md:py-20">
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {services.map((service, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={`liquid-glass p-6 md:p-8 rounded-2xl md:rounded-3xl bg-gradient-to-br ${service.color} transition-all group cursor-default`}
          >
            <service.icon className="w-8 h-8 text-white mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-semibold text-lg mb-2">{service.title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{service.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default Services;
