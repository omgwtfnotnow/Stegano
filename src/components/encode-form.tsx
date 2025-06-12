
"use client";

import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Download, Loader2, Link as LinkIcon, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_MESSAGE_LENGTH = 500;

interface EncodeFormProps {
  onEncode: (imageIdentifier: string, message: string, imageFile?: File, imageUrl?: string) => void;
  isLoading: boolean;
  encodedImageUrl?: string | null; // For previewing the original image
  encodedImageFile?: File | null;   // For previewing and packaging the original image
  encodedImageIdentifier?: string | null;
  lastEncodedMessage?: string | null; // The message that was just encoded
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
    // Clean up any dynamically created object URLs for image previews
    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [objectUrlToRevoke]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    setObjectUrlToRevoke(null);

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Error", description: "Image size should not exceed 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setImageUrlInput(''); 
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageSrc(result);
        if (result.startsWith('blob:')) {
            setObjectUrlToRevoke(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    setObjectUrlToRevoke(null);
    
    const url = event.target.value;
    setImageUrlInput(url);
    if (url) {
      setImageSrc(url); 
      setSelectedFile(null); 
    } else if (!selectedFile) {
      setImageSrc(null);
    }
  };

  const handleEncode = () => {
    if (!imageSrc) {
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
    if (!encodedImageFile && !encodedImageUrl?.startsWith('data:')) {
       toast({ title: "Info", description: "Download as .stegano package is only available for uploaded images or already loaded data URLs.", variant: "default" });
       // Attempt to download the URL directly if it's an HTTP/S URL, as a fallback
       if (encodedImageUrl && encodedImageUrl.startsWith('http')) {
          const link = document.createElement('a');
          link.href = encodedImageUrl;
          link.download = encodedImageIdentifier || 'image.png';
          link.target = '_blank'; // Open in new tab might be better for external URLs
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: "Info", description: "Attempting to download original image from URL. Actual steganography package not created for remote URLs." });
       }
       return;
    }
    if (!lastEncodedMessage) {
      toast({ title: "Error", description: "No message has been encoded for this image yet.", variant: "destructive" });
      return;
    }

    let imageDataUri = encodedImageUrl;
    let imageName = encodedImageIdentifier || 'image.png';

    if (encodedImageFile) {
      try {
        imageDataUri = await fileToDataUri(encodedImageFile);
        imageName = encodedImageFile.name;
      } catch (error) {
        console.error("Error converting file to Data URI:", error);
        toast({ title: "Error", description: "Could not read image file for packaging.", variant: "destructive" });
        return;
      }
    }
    
    if (!imageDataUri) {
         toast({ title: "Error", description: "Image data is not available for packaging.", variant: "destructive" });
        return;
    }

    const packageData = {
      imageName: imageName,
      imageDataUri: imageDataUri,
      secretMessage: lastEncodedMessage,
    };

    const jsonString = JSON.stringify(packageData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanImageName = imageName.substring(0, imageName.lastIndexOf('.')) || imageName;
    link.download = `${cleanImageName}.stegano`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Success", description: ".stegano package downloaded. Use this file to decode on any machine with this tool." });
  };

  const canDownloadPackage = !!(encodedImageFile || encodedImageUrl?.startsWith('data:')) && !!lastEncodedMessage;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Encode Message</CardTitle>
        <CardDescription>Upload an image, type your secret message, then download the combined `.stegano` package.</CardDescription>
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

        {imageSrc && (
          <div className="space-y-2">
            <Label>Image Preview</Label>
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

        <Button onClick={handleEncode} disabled={isLoading || (!imageSrc || !message.trim())} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
          Prepare Package
        </Button>

        {(encodedImageUrl || encodedImageFile) && lastEncodedMessage && (
          <div className="space-y-4 pt-4 border-t">
            <Alert variant="default" className="bg-primary/10">
                <Package className="h-4 w-4" />
                <AlertTitle>Package Ready for Download</AlertTitle>
                <AlertDescription>
                    Your image and message are prepared. Download the `.stegano` package to save or share.
                    This package can be decoded on another machine using this tool.
                </AlertDescription>
            </Alert>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image 
                src={encodedImageUrl || (encodedImageFile && objectUrlToRevoke ? objectUrlToRevoke : '')} // Use dynamic object URL if available from file
                alt="Preview of image to be packaged" 
                width={400} 
                height={300} 
                className="max-w-full max-h-[300px] object-contain rounded" 
                data-ai-hint="digital security"
              />
            </div>
            <Button onClick={handleDownloadPackage} variant="outline" className="w-full" disabled={!canDownloadPackage || isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Download .stegano Package
            </Button>
            {!encodedImageFile && encodedImageUrl?.startsWith('http') && (
                 <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>URL Limitation</AlertTitle>
                    <AlertDescription>
                        Packaging for download works best with uploaded images. For images from URLs, the original image might be downloaded instead of a package.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Note: This conceptual tool packages your image and message into a downloadable `.stegano` file for portability.</p>
      </CardFooter>
    </Card>
  );
}
