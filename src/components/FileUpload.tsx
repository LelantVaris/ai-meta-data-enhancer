import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileSelected: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  maxSize: number;
  onBeforeUpload?: (file: File) => boolean;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ onFileSelected, fileInputRef, accept, maxSize, onBeforeUpload }, ref) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;
      
      if (selectedFile && onBeforeUpload) {
        const shouldProceed = onBeforeUpload(selectedFile);
        if (!shouldProceed) {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }
      
      onFileSelected(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
          if (onBeforeUpload && !onBeforeUpload(droppedFile)) {
            return;
          }
          onFileSelected(droppedFile);
        }
      }
    };

    return (
      <div className="w-full">
        <motion.div
          className="border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.01, borderColor: "#d1d1d1" }}
          transition={{ duration: 0.2 }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="bg-neutral-100 p-3 rounded-full mb-3">
            <Upload className="h-6 w-6 text-neutral-500" />
          </div>
          <h3 className="text-base font-medium text-neutral-800 mb-1">
            Upload your CSV file
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            Drag and drop, or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("file-upload")?.click()}
            className="border-neutral-200 hover:bg-neutral-50 text-neutral-700"
          >
            Select File
          </Button>
        </motion.div>
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
