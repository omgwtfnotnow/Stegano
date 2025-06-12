
"use client";

import React, { useState, useEffect } from 'react';
import { SiteHeader } from '@/components/site-header';
import { EncodeForm } from '@/components/encode-form';
import { DecodeForm } from '@/components/decode-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'steganoEncodedMessages';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [encodedMessagesStore, setEncodedMessagesStore] = useState(new Map<string, string>());
  
  // Encode state - these are for the preview after encoding, before download
  const [encodedImageToDisplayUrl, setEncodedImageToDisplayUrl] = useState<string | null>(null);
  const [encodedImageToDisplayFile, setEncodedImageToDisplayFile] = useState<File | null>(null);
  const [encodedImageIdentifier, setEncodedImageIdentifier] = useState<string | null>(null);
  const [lastEncodedMessage, setLastEncodedMessage] = useState<string | null>(null);


  // Decode state
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedData) {
        const parsedMap = new Map<string, string>(JSON.parse(storedData));
        setEncodedMessagesStore(parsedMap);
      }
    } catch (error) {
      console.error("Failed to load encoded messages from localStorage", error);
      toast({
        title: "Storage Warning",
        description: "Could not load previously encoded messages from local storage.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleEncode = async (imageIdentifier: string, message: string, imageFile?: File, imageUrl?: string) => {
    setIsLoading(true);
    setEncodedImageToDisplayUrl(null);
    setEncodedImageToDisplayFile(null);
    setEncodedImageIdentifier(null);
    setLastEncodedMessage(null);

    // Simulate encoding delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newStore = new Map(encodedMessagesStore);
    newStore.set(imageIdentifier, message);
    setEncodedMessagesStore(newStore);
    setLastEncodedMessage(message); // Store for potential packaging by EncodeForm

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(newStore.entries())));
    } catch (error) {
      console.error("Failed to save encoded messages to localStorage", error);
      // Non-critical for .stegano flow, but good for local
    }
    
    if (imageFile) {
      setEncodedImageToDisplayFile(imageFile); // This is the original file
      setEncodedImageToDisplayUrl(URL.createObjectURL(imageFile)); 
    } else if (imageUrl) {
      setEncodedImageToDisplayUrl(imageUrl); // This is the original URL
    }
    setEncodedImageIdentifier(imageIdentifier);


    toast({
      title: "Encoding Complete",
      description: "Message has been conceptually prepared. You can now download it as a .stegano package.",
      action: <ShieldCheck className="h-5 w-5 text-green-500" />,
    });
    setIsLoading(false);
  };

  const handleDecode = async (
    imageIdentifier: string, 
    imageFile?: File, // This could be an image or .stegano file
    imageUrl?: string,
    directMessage?: string // If message extracted directly from .stegano file
  ) => {
    setIsLoading(true);
    setDecodedMessage(null);

    // Simulate decoding delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (directMessage !== undefined && directMessage !== null) {
      setDecodedMessage(directMessage);
      toast({
        title: "Decoding Complete",
        description: "Message was retrieved from the .stegano file.",
        action: <ShieldCheck className="h-5 w-5 text-green-500" />,
      });
    } else {
      const foundMessage = encodedMessagesStore.get(imageIdentifier);
      setDecodedMessage(foundMessage || ""); 

      if (foundMessage) {
        toast({
          title: "Decoding Complete",
          description: "Message was retrieved from local storage for this image identifier.",
          action: <ShieldCheck className="h-5 w-5 text-green-500" />,
        });
      } else {
        toast({
          title: "Decoding Attempted",
          description: "No message found for this image identifier in local storage, or it's not a .stegano file with an embedded message.",
          variant: "destructive",
          action: <ShieldAlert className="h-5 w-5 text-yellow-500" />,
        });
      }
    }
    setIsLoading(false);
  };
  
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
                encodedImageUrl={encodedImageToDisplayUrl} // original image url for preview
                encodedImageFile={encodedImageToDisplayFile} // original image file for preview & packaging
                encodedImageIdentifier={encodedImageIdentifier}
                lastEncodedMessage={lastEncodedMessage} // message to package
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
