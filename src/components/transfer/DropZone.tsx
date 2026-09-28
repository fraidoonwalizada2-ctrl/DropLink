import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileUp, FolderPlus, FileText, Image, Film, FileArchive } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
  isP2PConnected?: boolean;
  p2pState?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  className,
  disabled = false,
  isP2PConnected = false,
  p2pState = 'idle',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
    // Reset file input value so selecting the same file again triggers onChange
    if (e.target) {
      e.target.value = '';
    }
  };

  const triggerFilePicker = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (disabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.005 }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFilePicker}
      className={cn(
        'relative group cursor-pointer rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 border-2 border-dashed overflow-hidden select-none',
        isDragOver
          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/20 shadow-2xl shadow-sky-500/20 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/60 hover:border-sky-500/50 dark:hover:border-sky-500/50',
        disabled && 'opacity-60 cursor-not-allowed hover:border-slate-300 dark:hover:border-slate-700',
        className
      )}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Decorative Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Content wrapper with pointer-events-none so child text/icons do not trigger dragleave */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-4 pointer-events-none">
        {/* Animated Upload Icon Circle */}
        <div
          className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 shadow-xl',
            isDragOver
              ? 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-white scale-110 shadow-sky-500/30'
              : 'bg-gradient-to-tr from-sky-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:to-indigo-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 group-hover:scale-110'
          )}
        >
          {isDragOver ? (
            <FolderPlus className="w-10 h-10 animate-bounce text-white" />
          ) : (
            <Upload className="w-10 h-10" />
          )}
        </div>

        {/* Main Heading */}
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isDragOver ? 'Drop files to send' : 'Drop Here Anything'}
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {isP2PConnected
              ? 'Files, photos, videos, ZIPs and documents'
              : p2pState === 'connecting'
              ? 'Queued files will transfer automatically once P2P connects'
              : 'Add files anytime — will transfer once peer connects'}
          </p>
        </div>

        {/* File Type Pill Icons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs py-1">
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Image className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" /> Photos
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Film className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Videos
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Documents
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <FileArchive className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" /> Archives
          </span>
        </div>

        {/* Action Button - pointer-events-auto so it is directly clickable */}
        <div className="pt-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={triggerFilePicker}
            disabled={disabled}
            icon={<FileUp className="w-4 h-4" />}
          >
            Choose Files
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
