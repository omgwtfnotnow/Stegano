
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SiteHeader } from '@/components/site-header';
import { EncodeForm } from '@/components/encode-form';
import { DecodeForm } from '@/components/decode-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BITS_FOR_LENGTH = 32; // Using 32 bits to store the length of the message

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  
  const [encodedImageResult, setEncodedImageResult] = useState<{dataUrl: string, originalName: string} | null>(null);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const clearNotifications = () => {
    setError(null);
    setDecodedMessage(null);
    setEncodedImageResult(null);
  };

  // Helper: Convert text to a binary string
  const textToBinary = (text: string): string => {
    return text.split('').map(char => {
      const binary = char.charCodeAt(0).toString(2);
      return '0'.repeat(8 - binary.length) + binary;
    }).join('');
  };

  // Helper: Convert binary string to text
  const binaryToText = (binary: string): string => {
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substring(i, i + 8);
      text += String.fromCharCode(parseInt(byte, 2));
    }
    return text;
  };

  const handleEncode = useCallback(async (imageFile: File, message: string) => {
    clearNotifications();
    setIsLoading(true);

    if (!imageFile.type.startsWith('image/')) {
        toast({ title: "Error", description: "Invalid file type. Please upload an image.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
     if (imageFile.type !== 'image/png') {
        toast({ title: "Warning", description: "For best results with LSB steganography, PNG images are recommended. The output will be PNG.", variant: "default", duration: 7000 });
    }


    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result || typeof event.target.result !== 'string') {
        toast({ title: "Error", description: "Could not read image file.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast({ title: "Error", description: "Could not get canvas context.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const binaryMessage = textToBinary(message);
        const messageLengthBinary = binaryMessage.length.toString(2).padStart(BITS_FOR_LENGTH, '0');
        const fullBinaryPayload = messageLengthBinary + binaryMessage;

        const maxCapacityBits = img.width * img.height * 3; // 3 color channels (RGB)
        if (fullBinaryPayload.length > maxCapacityBits) {
          toast({ title: "Error", description: `Message too long for this image. Max bits: ${maxCapacityBits}, Required bits: ${fullBinaryPayload.length}.`, variant: "destructive" });
          setError(`Message too long for this image. Max capacity: ${Math.floor(maxCapacityBits / 8)} bytes. Message size: ${Math.ceil(fullBinaryPayload.length / 8)} bytes.`);
          setIsLoading(false);
          return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let bitIndex = 0;

        for (let i = 0; i < data.length && bitIndex < fullBinaryPayload.length; i += 4) {
          // Iterate RGB, skip Alpha
          for (let j = 0; j < 3 && bitIndex < fullBinaryPayload.length; j++) {
            let val = data[i + j];
            // Clear LSB
            val = val & ~1; 
            // Set LSB if bit is 1
            if (fullBinaryPayload[bitIndex] === '1') {
              val = val | 1;
            }
            data[i + j] = val;
            bitIndex++;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const encodedDataUrl = canvas.toDataURL('image/png'); // Output as PNG
        
        const originalNameParts = imageFile.name.split('.');
        originalNameParts.pop(); // remove original extension
        const baseName = originalNameParts.join('.') || 'encoded_image';
        const newFileName = `${baseName}.png`;


        setEncodedImageResult({ dataUrl: encodedDataUrl, originalName: newFileName });
        toast({
          title: "Encoding Complete",
          description: "Message has been embedded into the image. You can now download the new image.",
          action: <ShieldCheck className="h-5 w-5 text-green-500" />,
        });
        setIsLoading(false);
      };
      img.onerror = () => {
        toast({ title: "Error", description: "Could not load image for encoding.", variant: "destructive" });
        setIsLoading(false);
      };
      img.src = event.target.result as string;
    };
    reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read file.", variant: "destructive" });
        setIsLoading(false);
    }
    reader.readAsDataURL(imageFile);
  }, [toast]);

  const handleDecode = useCallback(async (imageFile: File) => {
    clearNotifications();
    setIsLoading(true);

    if (!imageFile.type.startsWith('image/')) {
        toast({ title: "Error", description: "Invalid file type. Please upload an image.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    if (imageFile.type !== 'image/png') {
        toast({ title: "Warning", description: "This tool primarily supports LSB decoding from PNG images. Results with other formats may be unreliable.", variant: "default", duration: 7000 });
    }


    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result || typeof event.target.result !== 'string') {
        toast({ title: "Error", description: "Could not read image file.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast({ title: "Error", description: "Could not get canvas context.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let binaryLength = '';
        let bitIndex = 0;

        // Extract message length (first BITS_FOR_LENGTH bits)
        for (let i = 0; i < data.length && binaryLength.length < BITS_FOR_LENGTH; i += 4) {
          for (let j = 0; j < 3 && binaryLength.length < BITS_FOR_LENGTH; j++) {
            binaryLength += (data[i + j] & 1).toString();
            bitIndex++;
          }
        }
        
        if (binaryLength.length < BITS_FOR_LENGTH) {
            toast({ title: "Decoding Error", description: "Image too small or not encoded properly (could not read message length).", variant: "destructive" });
            setError("Could not read message length. Image might not be encoded or is too small.");
            setIsLoading(false);
            return;
        }

        const messageLength = parseInt(binaryLength, 2);
        if (isNaN(messageLength) || messageLength <= 0 || messageLength > img.width * img.height * 3) {
            toast({ title: "Decoding Error", description: "Invalid or no message length found in image.", variant: "destructive" });
            setError("Invalid message length found. Image might not be encoded or is corrupted.");
            setIsLoading(false);
            return;
        }
        
        let binaryMessage = '';
        let messageBitIndex = 0; // Relative to start of message bits, after length bits
        let overallBitIndex = 0; // Tracks overall bits read from image data

        for (let i = 0; i < data.length && messageBitIndex < messageLength; i += 4) {
             for (let j = 0; j < 3 && messageBitIndex < messageLength; j++) {
                if (overallBitIndex >= BITS_FOR_LENGTH) { // Start reading message bits only after length bits
                    binaryMessage += (data[i + j] & 1).toString();
                    messageBitIndex++;
                }
                overallBitIndex++;
            }
        }

        if (binaryMessage.length < messageLength) {
          toast({ title: "Decoding Incomplete", description: "Could not extract the full message. Image might be corrupted or message was truncated.", variant: "destructive" });
          setError("Failed to extract the complete message. Data might be incomplete or corrupted.");
          setIsLoading(false);
          return;
        }

        const decodedMsg = binaryToText(binaryMessage);
        setDecodedMessage(decodedMsg);
        toast({
          title: "Decoding Complete",
          description: "Message extracted from image.",
          action: <ShieldCheck className="h-5 w-5 text-green-500" />,
        });
        setIsLoading(false);
      };
      img.onerror = () => {
        toast({ title: "Error", description: "Could not load image for decoding.", variant: "destructive" });
        setIsLoading(false);
      };
      img.src = event.target.result as string;
    };
    reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read file.", variant: "destructive" });
        setIsLoading(false);
    }
    reader.readAsDataURL(imageFile);
  }, [toast]);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          {isLoading && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="encode" className="w-full" onValueChange={clearNotifications}>
            <TabsList className="grid w-full grid-cols-2 bg-primary/10 mb-6">
              <TabsTrigger value="encode" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md">
                Encode
              </TabsTrigger>
              <TabsTrigger value="decode" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md">
                Decode
              </TabsTrigger>
            </TabsList>
            <TabsContent value="encode">
              <EncodeForm 
                onEncode={handleEncode} 
                isLoading={isLoading} 
                encodedImageResult={encodedImageResult}
              />
            </TabsContent>
            <TabsContent value="decode">
              <DecodeForm 
                onDecode={handleDecode} 
                isLoading={isLoading} 
                decodedMessage={decodedMessage}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Stegano App &copy; {new Date().getFullYear()} - LSB Steganography Tool
      </footer>
    </div>
  );
}
