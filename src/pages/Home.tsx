import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, Sparkles, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { HeroConnectionVisual } from '@/components/common/HeroConnectionVisual';
import { HowItWorksSection } from '@/components/how-it-works/HowItWorksSection';
import { PrivacySection } from '@/components/privacy/PrivacySection';
import { FeaturesSection } from '@/components/features/FeaturesSection';
import { isValidRoomCode } from '@/utils/validators';

export const Home: React.FC = () => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [inputError, setInputError] = useState('');
  const navigate = useNavigate();

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setInputError('Please enter a 6-character room code.');
      return;
    }
    if (!isValidRoomCode(cleanCode)) {
      setInputError('Room code must be 6 alphanumeric characters.');
      return;
    }
    navigate(`/room/${cleanCode}`);
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section */}
      <section className="pt-8 sm:pt-16 pb-12 text-center space-y-8 max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <Badge variant="cyan" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            PRIVATE DEVICE TRANSFER
          </Badge>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
        >
          Move anything.{' '}
          <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Anywhere.
          </span>
        </motion.h1>

        {/* Supporting text */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
        >
          Transfer files between your devices without accounts, cables, or messaging apps.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <Link to="/create" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto min-w-[200px] justify-center"
              icon={<PlusCircle className="w-5 h-5" />}
            >
              Create Transfer Room
            </Button>
          </Link>

          <Link to="/join" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto min-w-[180px] justify-center"
              icon={<Sparkles className="w-5 h-5 text-sky-400" />}
            >
              Join a Room
            </Button>
          </Link>
        </motion.div>

        {/* Hero Visual Component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="pt-4"
        >
          <HeroConnectionVisual />
        </motion.div>
      </section>

      {/* Main User Flow Direct Action Cards */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room Action Box */}
          <div className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-6 hover:border-sky-500/40 transition-colors">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Create a Room
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Start a private transfer session. Generates a unique 6-character room code and instant QR code for your secondary device.
              </p>
            </div>

            <Link to="/create" className="w-full">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-between"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Create Room
              </Button>
            </Link>
          </div>

          {/* Join a Room Action Box */}
          <div className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-6 hover:border-purple-500/40 transition-colors">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Join a Room
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter a room code to connect another device and transfer files peer-to-peer.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3 w-full">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => {
                    setRoomCodeInput(e.target.value.toUpperCase());
                    setInputError('');
                  }}
                  placeholder="e.g. K7X9P2"
                  className="flex-1 uppercase font-mono tracking-widest px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-bold text-sm"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  disabled={!roomCodeInput.trim()}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Join Room
                </Button>
              </div>
              {inputError && (
                <p className="text-xs font-medium text-red-500 text-left">{inputError}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <HowItWorksSection />

      {/* Features section */}
      <FeaturesSection />

      {/* Privacy section */}
      <PrivacySection />
    </div>
  );
};
