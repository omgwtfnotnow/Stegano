
"use client";

import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileSearch, Loader2, Link as LinkIcon, FileJson, PackageCheck } from 'lucide-react';
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
  const [isPackagedFileProcessed, setIsPackagedFileProcessed] = useState<boolean>(false);
  const { toast } = useToast();

  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);

   useEffect(() => {
    // Clean up any dynamically created object URLs
    const currentObjectUrl = objectUrlToRevoke;
    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [objectUrlToRevoke]);

  const handleFileUpload = (file: File) => {
    if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        setObjectUrlToRevoke(null);
    }
    setSelectedFile(null);
    setImageSrc(null);
    setIsPackagedFileProcessed(false);
    setImageUrlInput(''); 

    if (file.size > 10 * 1024 * 1024) { // 10MB limit (image + message)
      toast({ title: "Error", description: "File size should not exceed 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const content = reader.result as string;
        try {
            const parsedData = JSON.parse(content);
            if (parsedData.imageDataUri && parsedData.secretMessage !== undefined && parsedData.imageName) {
                // Successfully parsed as our JSON package
                setImageSrc(parsedData.imageDataUri);
                setSelectedFile(file); 
                onDecode(parsedData.imageName, undefined, parsedData.imageDataUri, parsedData.secretMessage);
                setIsPackagedFileProcessed(true);
                return;
            } else {
                throw new Error("Valid JSON, but not the expected package format.");
            }
        } catch (jsonError) {
            // JSON.parse failed or it wasn't our package structure. Try to treat as a plain image.
            if (file.type.startsWith('image/')) {
                const imagePreviewReader = new FileReader();
                imagePreviewReader.onloadend = () => {
                    const result = imagePreviewReader.result as string;
                    setImageSrc(result);
                    setSelectedFile(file);
                    // Manage object URL for plain images if created by readAsDataURL which returns a blob: URL
                    if (result.startsWith('blob:')) {
                        setObjectUrlToRevoke(result);
                    }
                };
                imagePreviewReader.onerror = () => {
                     toast({ title: "Error", description: "Could not read the image file for preview.", variant: "destructive" });
                     setImageSrc(null); setSelectedFile(null);
                }
                imagePreviewReader.readAsDataURL(file);
            } else {
                toast({ title: "Error", description: "Unsupported file type or corrupted encoded file.", variant: "destructive" });
                setImageSrc(null); setSelectedFile(null);
            }
        }
    };
    reader.onerror = () => {
        toast({ title: "Error", description: "Could not read the file.", variant: "destructive" });
        setImageSrc(null); setSelectedFile(null);
    }
    reader.readAsText(file); // Attempt to read as text for JSON parsing first
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };
  
  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        setObjectUrlToRevoke(null);
    }
    setIsPackagedFileProcessed(false);
    const url = event.target.value;
    setImageUrlInput(url);
    if (url) {
      setImageSrc(url); 
      setSelectedFile(null); 
    } else if (!selectedFile) {
      setImageSrc(null);
    }
  };

  const handleDecodeClick = () => {
    // This button is for images from URL or plain uploaded images (non-packaged)
    if (!imageSrc && !selectedFile) { // Check selectedFile as well
      toast({ title: "Error", description: "Please upload an image/encoded file or provide an image URL to decode.", variant: "destructive" });
      return;
    }
    
    if (isPackagedFileProcessed) {
        toast({ title: "Info", description: "Encoded file was already processed on upload.", variant: "default" });
        return;
    }

    if (selectedFile) { // This implies it's a plain image not auto-decoded
        onDecode(selectedFile.name, selectedFile, undefined, undefined);
    } else if (imageUrlInput) {
        onDecode(imageUrlInput, undefined, imageUrlInput, undefined);
    } else {
        toast({ title: "Error", description: "No image selected or URL provided for manual decoding.", variant: "destructive" });
    }
  };
  

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Decode Message</CardTitle>
        <CardDescription>Upload an image or an encoded file (e.g., `.png`, `.jpg`) to reveal a hidden message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload-decode">Upload Image or Encoded File</Label>
          <div className="flex items-center space-x-2">
            <Input id="file-upload-decode" type="file" accept="image/png, image/jpeg, image/webp, application/json, .json" onChange={handleImageFileChange} className="flex-grow"/>
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center py-1">OR (for plain images not encoded with this tool)</p>
          <Label htmlFor="image-url-decode">Enter Image URL</Label>
          <div className="flex items-center space-x-2">
            <Input id="image-url-decode" type="url" placeholder="https://example.com/image_with_secret.png" value={imageUrlInput} onChange={handleImageUrlChange} className="flex-grow" />
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {imageSrc && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={imageSrc} alt="Selected preview for decoding" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="geometric abstract puzzle" />
            </div>
          </div>
        )}

        {!isPackagedFileProcessed && (
            <Button onClick={handleDecodeClick} disabled={isLoading || (!imageSrc && !selectedFile)} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
            Decode from Image/URL (local check)
            </Button>
        )}
        {isPackagedFileProcessed && (
             <Alert variant="default" className="bg-primary/10">
                <PackageCheck className="h-4 w-4" />
                <AlertTitle>Encoded File Processed</AlertTitle>
                <AlertDescription>
                    The encoded file was automatically processed on upload. The decoded message (if any) is shown below.
                </AlertDescription>
            </Alert>
        )}


        {decodedMessage !== null && decodedMessage !== undefined && (
          <div className="pt-4">
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
         <p className="text-xs text-muted-foreground">Note: Uploading an encoded file (e.g. a `.png` downloaded from this tool) extracts its embedded message. Decoding plain images/URLs relies on messages "hidden" in this browser's local storage.</p>
      </CardFooter>
    </Card>
  );
}
