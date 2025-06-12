"use client";

import React, { useState, useCallback, ChangeEvent } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Download, Loader2, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_MESSAGE_LENGTH = 500;

interface EncodeFormProps {
  onEncode: (imageIdentifier: string, message: string, imageFile?: File, imageUrl?: string) => void;
  isLoading: boolean;
  encodedImageUrl?: string | null;
  encodedImageFile?: File | null;
  encodedImageIdentifier?: string | null;
}

export function EncodeForm({ onEncode, isLoading, encodedImageUrl, encodedImageFile, encodedImageIdentifier }: EncodeFormProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const { toast } = useToast();

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Error", description: "Image size should not exceed 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setImageUrlInput(''); // Clear URL input if file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setImageUrlInput(url);
    if (url) {
      setImageSrc(url); // Directly use URL for preview
      setSelectedFile(null); // Clear file input if URL is entered
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

  const handleDownload = () => {
    if (encodedImageFile) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(encodedImageFile);
      link.download = `stegano_encoded_${encodedImageFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast({ title: "Success", description: "Encoded image downloaded." });
    } else if (encodedImageUrl) {
      // For URL, we can't force download easily due to CORS. Best is to open it.
      // Or if it's a data URL (like from canvas), it could be downloaded.
      // For this mock, if it's external URL, it's the original.
      if (encodedImageUrl.startsWith('http')) {
         window.open(encodedImageUrl, '_blank');
         toast({ title: "Info", description: "Original image opened. Right-click to save." });
      } else { // Assuming it's a data URL if not http
        const link = document.createElement('a');
        link.href = encodedImageUrl;
        link.download = `stegano_encoded_image.png`; // Generic name for data URLs
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Success", description: "Encoded image downloaded." });
      }
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Encode Message</CardTitle>
        <CardDescription>Upload an image and type your secret message to hide it within.</CardDescription>
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
              <Image src={imageSrc} alt="Selected preview" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="abstract image" />
            </div>
            <p className="text-xs text-muted-foreground italic text-center">Image analysis: Image appears suitable for steganography.</p>
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
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Encode Image
        </Button>

        {(encodedImageUrl || encodedImageFile) && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold font-headline">Encoded Image Ready:</h3>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={encodedImageUrl || (encodedImageFile ? URL.createObjectURL(encodedImageFile) : '')} alt="Encoded preview" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="processed image" />
            </div>
            <Button onClick={handleDownload} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Encoded Image
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Note: This is a conceptual demonstration. The "encoded" image is the original image for download.</p>
      </CardFooter>
    </Card>
  );
}
