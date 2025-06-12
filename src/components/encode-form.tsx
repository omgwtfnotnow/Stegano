
"use client";

import React, { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Download, Package, Info, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_MESSAGE_LENGTH = 1000; // Increased capacity, but still limited by image size
const BITS_FOR_LENGTH = 32;

interface EncodeFormProps {
  onEncode: (imageFile: File, message: string) => void;
  isLoading: boolean;
  encodedImageResult?: { dataUrl: string, originalName: string } | null;
}

export function EncodeForm({ 
  onEncode, 
  isLoading, 
  encodedImageResult
}: EncodeFormProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>('');
  const [imageCapacity, setImageCapacity] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Revoke object URL when component unmounts or when the source changes
    const currentObjectUrl = imagePreviewUrl;
    if (currentObjectUrl && currentObjectUrl.startsWith('blob:')) {
        return () => {
            URL.revokeObjectURL(currentObjectUrl);
        };
    }
  }, [imagePreviewUrl]);
  
  const calculateCapacity = (width: number, height: number): number => {
    const totalBits = width * height * 3; // RGB channels
    const availableBitsForMessage = totalBits - BITS_FOR_LENGTH;
    return Math.floor(availableBitsForMessage / 8); // Bytes
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImagePreviewUrl(null); // Clear previous preview
    setSelectedFile(null);
    setImageCapacity(null);
    if (encodedImageResult) { // If there's a result from a previous encode, it's now stale
        // Parent component's state handles clearing this result on new tab selection or encode action
    }

    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please upload a valid image file (PNG, JPG, etc.). Output will be PNG.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "Error", description: "Image size should not exceed 10MB.", variant: "destructive" });
        return;
      }
      
      setSelectedFile(file);
      const newObjectUrl = URL.createObjectURL(file);
      setImagePreviewUrl(newObjectUrl);

      const img = new window.Image();
      img.onload = () => {
        const capacity = calculateCapacity(img.width, img.height);
        setImageCapacity(capacity);
        if (message.length > capacity) {
            toast({ title: "Warning", description: `Current message (${message.length} chars) exceeds image capacity (${capacity} chars).`, variant: "destructive" });
        }
      };
      img.src = newObjectUrl;

    }
  };

  const handleEncode = () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Error", description: "Please enter a secret message.", variant: "destructive" });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) { // General guard
      toast({ title: "Error", description: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`, variant: "destructive" });
      return;
    }
    if (imageCapacity !== null && message.length > imageCapacity) {
         toast({ title: "Error", description: `Message (${message.length} chars) is too long for the selected image's capacity (${imageCapacity} chars).`, variant: "destructive" });
        return;
    }

    onEncode(selectedFile, message);
  };

  const handleDownloadEncodedImage = () => {
    if (!encodedImageResult) {
      toast({ title: "Error", description: "No encoded image available for download.", variant: "destructive" });
      return;
    }
    const link = document.createElement('a');
    link.href = encodedImageResult.dataUrl;
    link.download = encodedImageResult.originalName; // e.g., "myimage_encoded.png"
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ 
        title: "Download Started", 
        description: `Encoded image "${encodedImageResult.originalName}" is downloading. This is a standard viewable PNG file.`,
        duration: 7000 
    });
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Encode Message into Image</CardTitle>
        <CardDescription>Upload an image (PNG recommended), type your secret message. The tool will embed the message into the image pixels. Download the new PNG image.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="image-upload-encode">Upload Image (PNG, JPG, etc. - Output is PNG)</Label>
          <div className="flex items-center space-x-2">
            <Input id="image-upload-encode" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageFileChange} className="flex-grow" />
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {imagePreviewUrl && (
          <div className="space-y-2">
            <Label>Image Preview (Original)</Label>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={imagePreviewUrl} alt="Selected preview for encoding" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="abstract image" />
            </div>
             {imageCapacity !== null && (
                <p className="text-xs text-muted-foreground">Estimated capacity: {imageCapacity} characters.</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="secret-message-encode">Secret Message</Label>
          <Textarea
            id="secret-message-encode"
            placeholder="Type your secret message here..."
            value={message}
            onChange={(e) => {
                const newMsg = e.target.value;
                setMessage(newMsg);
                if (imageCapacity !== null && newMsg.length > imageCapacity) {
                    toast({ title: "Warning", description: `Message (${newMsg.length} chars) exceeds image capacity (${imageCapacity} chars).`, variant: "destructive", duration: 3000 });
                } else if (newMsg.length > MAX_MESSAGE_LENGTH) {
                    toast({ title: "Warning", description: `Message exceeds general limit of ${MAX_MESSAGE_LENGTH} chars.`, variant: "destructive", duration: 3000 });
                }
            }}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH * 1.2} // Allow slight overtype for feedback
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/{MAX_MESSAGE_LENGTH} characters (Max for UI, actual limit depends on image)
          </p>
        </div>

        <Button onClick={handleEncode} disabled={isLoading || !selectedFile || !message.trim()} className="w-full">
          <Package className="mr-2 h-4 w-4" />
          Encode Message into Image
        </Button>

        {encodedImageResult && (
          <div className="space-y-4 pt-4 border-t">
            <Alert variant="default" className="bg-primary/10">
                <FileImage className="h-4 w-4" />
                <AlertTitle>Image Encoded Successfully!</AlertTitle>
                <AlertDescription>
                    Your message has been embedded. Download the new image file.
                </AlertDescription>
            </Alert>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
                <Image 
                    src={encodedImageResult.dataUrl} 
                    alt="Preview of the LSB encoded image" 
                    width={400} 
                    height={300} 
                    className="max-w-full max-h-[300px] object-contain rounded" 
                    data-ai-hint="digital security"
                />
            </div>
            <Button onClick={handleDownloadEncodedImage} variant="outline" className="w-full" disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Download Encoded PNG Image
            </Button>
            <Alert variant="default" className="mt-2">
                <Info className="h-4 w-4" />
                <AlertTitle>About the Encoded Image</AlertTitle>
                <AlertDescription>
                    The downloaded PNG file is a standard image that can be viewed normally. The secret message is hidden within its pixel data.
                    It can be decoded by uploading it back to this tool.
                </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">This tool uses LSB (Least Significant Bit) steganography to hide messages in images. Best results with PNG files.</p>
      </CardFooter>
    </Card>
  );
}
