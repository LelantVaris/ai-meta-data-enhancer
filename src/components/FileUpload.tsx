
import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ file, onChange }, ref) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;
      onChange(selectedFile);
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
          onChange(droppedFile);
        }
      }
    };

    const removeFile = () => {
      onChange(null);
      // Reset the file input value
      if (ref && 'current' in ref && ref.current) {
        ref.current.value = '';
      }
    };

    return (
      <div className="w-full">
        {!file ? (
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
              ref={ref}
              type="file"
              accept=".csv"
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
        ) : (
          <motion.div 
            className="border border-neutral-200 rounded-lg p-4 bg-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <div className="bg-neutral-100 p-2 rounded-md mr-3">
                <File className="h-5 w-5 text-neutral-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">
                  {file.size < 1024
                    ? `${file.size} bytes`
                    : file.size < 1048576
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / 1048576).toFixed(1)} MB`}
                </p>
              </div>
              <button 
                onClick={removeFile}
                className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-full hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
