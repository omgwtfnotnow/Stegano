
"use client";

import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Download, Loader2, Link as LinkIcon, Package, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_MESSAGE_LENGTH = 500;

interface EncodeFormProps {
  onEncode: (imageIdentifier: string, message: string, imageFile?: File, imageUrl?: string) => void;
  isLoading: boolean;
  encodedImageUrl?: string | null; 
  encodedImageFile?: File | null;   
  encodedImageIdentifier?: string | null;
  lastEncodedMessage?: string | null; 
}

export function EncodeForm({ 
  onEncode, 
  isLoading, 
  encodedImageUrl, 
  encodedImageFile, 
  encodedImageIdentifier,
  lastEncodedMessage 
}: EncodeFormProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const { toast } = useToast();

  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);

  useEffect(() => {
    // Revoke object URL when component unmounts or when the source changes
    const currentObjectUrl = objectUrlToRevoke;
    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [objectUrlToRevoke]);
  
  // Effect to update imageSrc and manage object URLs when props change
  useEffect(() => {
    if (encodedImageFile) {
        const newObjectUrl = URL.createObjectURL(encodedImageFile);
        setImageSrc(newObjectUrl);
        setObjectUrlToRevoke(newObjectUrl);
    } else if (encodedImageUrl) {
        setImageSrc(encodedImageUrl);
        // If it's a blob URL passed via prop that we created, it should be managed by parent or revoked there.
        // For non-blob URLs, no revocation needed here.
    } else {
        setImageSrc(null);
    }
  }, [encodedImageFile, encodedImageUrl]);


  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke); // Revoke previous local object URL
    setObjectUrlToRevoke(null);

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Error", description: "Image size should not exceed 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file); // This will be passed to onEncode
      setImageUrlInput(''); 
      const newObjectUrl = URL.createObjectURL(file); // Create new local object URL for preview
      setImageSrc(newObjectUrl);
      setObjectUrlToRevoke(newObjectUrl);
    } else {
      setImageSrc(null); // Clear preview if no file selected
      setSelectedFile(null);
    }
  };

  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke); // Revoke previous local object URL
    setObjectUrlToRevoke(null);
    
    const url = event.target.value;
    setImageUrlInput(url); // This will be passed to onEncode
    if (url) {
      setImageSrc(url); 
      setSelectedFile(null); 
    } else if (!selectedFile) { // only clear preview if no file is also selected
      setImageSrc(null);
    }
  };

  const handleEncode = () => {
    if (!imageSrc && !selectedFile && !imageUrlInput) { // Check all possible sources
      toast({ title: "Error", description: "Please upload an image or provide an image URL.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Error", description: "Please enter a secret message.", variant: "destructive" });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast({ title: "Error", description: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`, variant: "destructive" });
      return;
    }

    const identifier = selectedFile ? selectedFile.name : imageUrlInput;
    onEncode(identifier, message, selectedFile || undefined, imageUrlInput || undefined);
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDownloadPackage = async () => {
    // Use the image state passed back from HomePage after encoding, not the local one.
    const currentImageFile = encodedImageFile;
    const currentImageUrl = encodedImageUrl; // This could be a blob URL from HomePage or original URL
    const currentImageIdentifier = encodedImageIdentifier;

    if (!currentImageFile && !currentImageUrl?.startsWith('data:')) {
       toast({ title: "Info", description: "Download as encoded file is primarily for uploaded images. For remote URLs, direct packaging isn't supported; only local encoding reference is made.", variant: "default" });
       if (currentImageUrl && currentImageUrl.startsWith('http')) {
          // Fallback for http urls - not a package
          const link = document.createElement('a');
          link.href = currentImageUrl;
          link.download = currentImageIdentifier || 'image_from_url.png';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: "Info", description: "Attempting to download original image from URL. This is NOT an encoded package.", variant: "destructive" });
       }
       return;
    }
    if (!lastEncodedMessage) {
      toast({ title: "Error", description: "No message has been encoded for this image yet.", variant: "destructive" });
      return;
    }

    let imageDataUriToPackage = currentImageUrl; // This could be a blob: or data: URL already
    let imageNameForPackage = currentImageIdentifier || 'image.png';

    if (currentImageFile) {
      try {
        imageDataUriToPackage = await fileToDataUri(currentImageFile);
        imageNameForPackage = currentImageFile.name;
      } catch (error) {
        console.error("Error converting file to Data URI:", error);
        toast({ title: "Error", description: "Could not read image file for packaging.", variant: "destructive" });
        return;
      }
    }
    
    if (!imageDataUriToPackage) {
         toast({ title: "Error", description: "Image data is not available for packaging.", variant: "destructive" });
        return;
    }

    const packageData = {
      imageName: imageNameForPackage,
      imageDataUri: imageDataUriToPackage,
      secretMessage: lastEncodedMessage,
    };

    const jsonString = JSON.stringify(packageData);
    const blob = new Blob([jsonString], { type: 'application/json' }); // Content is JSON
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Set download filename to original name and extension
    const nameParts = imageNameForPackage.split('.');
    const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '.png'; // Default to .png if no ext
    const baseName = nameParts.join('.') || 'encoded_image';
    const downloadFilename = `${baseName}${extension}`;
    link.download = downloadFilename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ 
        title: "Download Started", 
        description: `Encoded file "${downloadFilename}" is downloading. Note: This file contains your message and is intended for this tool; it may not open in standard image viewers.`,
        duration: 7000 
    });
  };
  
  // encodedImageUrl is the URL (blob or data) of the image *after* onEncode has run.
  // This might be the same as the initially uploaded/provided one.
  const previewImageUrlForDownloadSection = encodedImageUrl; 
  const canDownload = !!(encodedImageFile || encodedImageUrl?.startsWith('data:')) && !!lastEncodedMessage;


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Encode Message</CardTitle>
        <CardDescription>Upload an image, type your secret message, then download the encoded file. This file (e.g. `.png`) will contain your message and can be decoded by this tool on any machine.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="image-upload-encode">Upload Image</Label>
          <div className="flex items-center space-x-2">
            <Input id="image-upload-encode" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageFileChange} className="flex-grow" />
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center py-1">OR</p>
          <Label htmlFor="image-url-encode">Enter Image URL</Label>
           <div className="flex items-center space-x-2">
            <Input id="image-url-encode" type="url" placeholder="https://example.com/image.png" value={imageUrlInput} onChange={handleImageUrlChange} className="flex-grow" />
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {imageSrc && ( // This is the local preview before "Prepare"
          <div className="space-y-2">
            <Label>Image Preview (Original)</Label>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={imageSrc} alt="Selected preview for encoding" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="abstract image design" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="secret-message-encode">Secret Message</Label>
          <Textarea
            id="secret-message-encode"
            placeholder="Type your secret message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/{MAX_MESSAGE_LENGTH} characters
          </p>
        </div>

        <Button onClick={handleEncode} disabled={isLoading || (!selectedFile && !imageUrlInput) || !message.trim()} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
          Prepare Encoded File
        </Button>

        {/* This section appears after "Prepare Encoded File" is clicked and successful */}
        {(encodedImageFile || encodedImageUrl) && lastEncodedMessage && (
          <div className="space-y-4 pt-4 border-t">
            <Alert variant="default" className="bg-primary/10">
                <Package className="h-4 w-4" />
                <AlertTitle>File Ready for Download</AlertTitle>
                <AlertDescription>
                    Your image and message are prepared. Download the encoded file to save or share.
                </AlertDescription>
            </Alert>
            {previewImageUrlForDownloadSection && (
                 <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
                    <Image 
                        src={previewImageUrlForDownloadSection} 
                        alt="Preview of image to be packaged" 
                        width={400} 
                        height={300} 
                        className="max-w-full max-h-[300px] object-contain rounded" 
                        data-ai-hint="digital security lock"
                    />
                </div>
            )}
            <Button onClick={handleDownloadPackage} variant="outline" className="w-full" disabled={!canDownload || isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Download Encoded File
            </Button>
            <Alert variant="destructive" className="mt-2">
                <Info className="h-4 w-4" />
                <AlertTitle>Important Note on Downloaded File</AlertTitle>
                <AlertDescription>
                    The downloaded file (e.g., `.png`, `.jpg`) contains your message and is designed for this tool. It might not open correctly in standard image viewers.
                    It can be decoded by uploading it back to this tool on any machine.
                </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Note: This tool packages your image and message into a downloadable file (with the original image extension) for portability.</p>
      </CardFooter>
    </Card>
  );
}
