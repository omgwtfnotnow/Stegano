"use client";

import React, { useState, useEffect } from 'react';
import { SiteHeader } from '@/components/site-header';
import { EncodeForm } from '@/components/encode-form';
import { DecodeForm } from '@/components/decode-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert } from 'lucide-react';

// In-memory store for "encoded" messages for the session
const encodedMessagesStore = new Map<string, string>();

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Encode state
  const [encodedImageToDisplayUrl, setEncodedImageToDisplayUrl] = useState<string | null>(null);
  const [encodedImageToDisplayFile, setEncodedImageToDisplayFile] = useState<File | null>(null);
  const [encodedImageIdentifier, setEncodedImageIdentifier] = useState<string | null>(null);


  // Decode state
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);

  const { toast } = useToast();

  const handleEncode = async (imageIdentifier: string, message: string, imageFile?: File, imageUrl?: string) => {
    setIsLoading(true);
    setEncodedImageToDisplayUrl(null);
    setEncodedImageToDisplayFile(null);
    setEncodedImageIdentifier(null);

    // Simulate encoding delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    encodedMessagesStore.set(imageIdentifier, message);
    
    if (imageFile) {
      setEncodedImageToDisplayFile(imageFile);
      setEncodedImageToDisplayUrl(URL.createObjectURL(imageFile)); // For preview
    } else if (imageUrl) {
      setEncodedImageToDisplayUrl(imageUrl);
    }
    setEncodedImageIdentifier(imageIdentifier);

    toast({
      title: "Encoding Complete",
      description: "Message has been conceptually hidden in the image.",
      action: <ShieldCheck className="h-5 w-5 text-green-500" />,
    });
    setIsLoading(false);
  };

  const handleDecode = async (imageIdentifier: string, imageFile?: File, imageUrl?: string) => {
    setIsLoading(true);
    setDecodedMessage(null);

    // Simulate decoding delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const foundMessage = encodedMessagesStore.get(imageIdentifier);
    setDecodedMessage(foundMessage || ""); // Empty string if not found, to trigger "no message" UI

    if (foundMessage) {
      toast({
        title: "Decoding Complete",
        description: "A message was retrieved from the image.",
        action: <ShieldCheck className="h-5 w-5 text-green-500" />,
      });
    } else {
      toast({
        title: "Decoding Attempted",
        description: "No message found for this image in the current session.",
        variant: "destructive",
        action: <ShieldAlert className="h-5 w-5 text-yellow-500" />,
      });
    }
    setIsLoading(false);
  };
  
  // Clean up object URLs for encoded image preview if it's a file
  useEffect(() => {
    return () => {
      if (encodedImageToDisplayFile && encodedImageToDisplayUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(encodedImageToDisplayUrl);
      }
    };
  }, [encodedImageToDisplayFile, encodedImageToDisplayUrl]);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <Tabs defaultValue="encode" className="w-full">
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
                encodedImageUrl={encodedImageToDisplayUrl}
                encodedImageFile={encodedImageToDisplayFile}
                encodedImageIdentifier={encodedImageIdentifier}
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
        Stegano App &copy; {new Date().getFullYear()} - Conceptual Steganography Tool
      </footer>
    </div>
  );
}
