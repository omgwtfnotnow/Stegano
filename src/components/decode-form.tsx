
"use client";

import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileSearch, Loader2, Link as LinkIcon, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DecodeFormProps {
  onDecode: (imageIdentifier: string, imageFile?: File, imageUrl?: string, directMessage?: string) => void;
  isLoading: boolean;
  decodedMessage?: string | null;
}

export function DecodeForm({ onDecode, isLoading, decodedMessage }: DecodeFormProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const { toast } = useToast();

  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);

   useEffect(() => {
    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [objectUrlToRevoke]);

  const handleFileUpload = (file: File) => {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    setObjectUrlToRevoke(null);

    if (file.size > 10 * 1024 * 1024) { // Increased limit for .stegano files (image + message)
      toast({ title: "Error", description: "File size should not exceed 10MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setImageUrlInput(''); 

    if (file.name.endsWith('.stegano') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const content = reader.result as string;
          const parsedData = JSON.parse(content);
          if (parsedData.imageDataUri && parsedData.secretMessage !== undefined && parsedData.imageName) {
            setImageSrc(parsedData.imageDataUri); // This might be a data URI
            // No need to create object URL for data URI if it's already one.
            // If it's a blob data URI that needs revoking, it's handled by imageSrc effect.
            onDecode(parsedData.imageName, undefined, parsedData.imageDataUri, parsedData.secretMessage);
          } else {
            throw new Error("Invalid .stegano file format.");
          }
        } catch (e) {
          console.error("Error parsing .stegano file:", e);
          toast({ title: "Error", description: "Could not parse .stegano file. It might be corrupted or not in the correct format.", variant: "destructive" });
          setImageSrc(null);
          setSelectedFile(null);
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageSrc(result);
        const newObjectUrl = URL.createObjectURL(file);
        setObjectUrlToRevoke(newObjectUrl); // Manage object URL for plain images
        // For plain images, we don't call onDecode immediately, user clicks button
      };
      reader.readAsDataURL(file); // For preview of plain image
    } else {
        toast({ title: "Error", description: "Unsupported file type. Please upload an image or a .stegano file.", variant: "destructive" });
        setImageSrc(null);
        setSelectedFile(null);
    }
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };
  
  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    setObjectUrlToRevoke(null);

    const url = event.target.value;
    setImageUrlInput(url);
    if (url) {
      setImageSrc(url); // Directly use URL for preview
      setSelectedFile(null); // Clear file input if URL is entered
    } else if (!selectedFile) {
      setImageSrc(null);
    }
  };

  const handleDecodeClick = () => {
    // This button is mainly for images from URL or plain uploaded images (non .stegano)
    if (!imageSrc) {
      toast({ title: "Error", description: "Please upload an image/package or provide an image URL to decode.", variant: "destructive" });
      return;
    }
    // If it was a .stegano file, onDecode was already called.
    // This call is for plain images or URLs, relying on localStorage.
    if (selectedFile && !selectedFile.name.endsWith('.stegano')) {
        onDecode(selectedFile.name, selectedFile, undefined, undefined);
    } else if (imageUrlInput) {
        onDecode(imageUrlInput, undefined, imageUrlInput, undefined);
    } else if (selectedFile && selectedFile.name.endsWith('.stegano')) {
        // .stegano files are auto-decoded on upload, but if user clicks button again:
        toast({ title: "Info", description: ".stegano file was already processed on upload.", variant: "default" });
    } else {
        toast({ title: "Error", description: "No image selected or URL provided for manual decoding.", variant: "destructive" });
    }
  };
  
  const isSteganoFileUploaded = selectedFile && (selectedFile.name.endsWith('.stegano') || selectedFile.type === 'application/json');

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Decode Message</CardTitle>
        <CardDescription>Upload an image or a `.stegano` package to reveal a hidden message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload-decode">Upload Image or `.stegano` Package</Label>
          <div className="flex items-center space-x-2">
            <Input id="file-upload-decode" type="file" accept="image/png, image/jpeg, image/webp, .stegano, application/json" onChange={handleImageFileChange} className="flex-grow"/>
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center py-1">OR (for images not in a package)</p>
          <Label htmlFor="image-url-decode">Enter Image URL</Label>
          <div className="flex items-center space-x-2">
            <Input id="image-url-decode" type="url" placeholder="https://example.com/image_with_secret.png" value={imageUrlInput} onChange={handleImageUrlChange} className="flex-grow" />
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {imageSrc && (
          <div className="space-y-2">
            <Label>Image Preview</Label>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={imageSrc} alt="Selected preview for decoding" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="geometric abstract" />
            </div>
          </div>
        )}

        {!isSteganoFileUploaded && ( // Only show decode button if not auto-decoded from .stegano
            <Button onClick={handleDecodeClick} disabled={isLoading || !imageSrc} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
            Decode from Image/URL (localStorage)
            </Button>
        )}
        {isSteganoFileUploaded && (
             <Alert variant="default" className="bg-primary/10">
                <FileJson className="h-4 w-4" />
                <AlertTitle>.stegano Package Processed</AlertTitle>
                <AlertDescription>
                    The `.stegano` package was automatically processed on upload. The decoded message (if any) is shown below.
                </AlertDescription>
            </Alert>
        )}


        {decodedMessage !== null && decodedMessage !== undefined && (
          <div className="pt-4"> {/* Removed border-t for cleaner look if button is not there */}
            <Alert variant={decodedMessage ? "default" : "destructive"} className="bg-card">
              <FileSearch className="h-4 w-4" />
              <AlertTitle className="font-headline">Decoded Message</AlertTitle>
              <AlertDescription className="break-words whitespace-pre-wrap">
                {decodedMessage || "No message found."}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground">Note: Decoding from `.stegano` packages extracts the embedded message. Decoding plain images/URLs relies on messages "hidden" in this browser's local storage during the current or previous sessions.</p>
      </CardFooter>
    </Card>
  );
}
