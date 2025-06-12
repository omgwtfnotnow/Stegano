
# Stegano - LSB Steganography Tool

Stegano is a web application that allows you to hide secret messages within images using Least Significant Bit (LSB) steganography and then decode them. This tool demonstrates the concept of steganography by directly manipulating image pixel data to embed and extract textual information.

## Core Features

-   **Encode Messages:** Upload an image and type a secret message. Stegano will embed the message into the image's pixel data.
-   **Decode Messages:** Upload an image (that was previously encoded with this tool) to extract the hidden message.
-   **LSB Steganography:** Utilizes the Least Significant Bit technique to hide data within the RGB color channels of image pixels.
-   **PNG Output:** Encoded images are always output as PNG files to preserve the integrity of the LSB data, as PNG is a lossless format.
-   **Real-time Binary Representation:** See the binary version of your message as you type during the encoding process.
-   **Capacity Indication:** The tool provides an estimate of how many characters an uploaded image can store.

## How It Works

Stegano uses LSB (Least Significant Bit) steganography. Here's a simplified overview:

1.  **Encoding:**
    *   Your secret message is converted into a binary string (a sequence of 0s and 1s).
    *   The length of this binary message is also converted to binary and prepended to the message's binary string. This allows the decoder to know how many bits to read.
    *   The application iterates through the image's pixels. For each color component (Red, Green, Blue) of a pixel, it replaces the least significant bit with a bit from your (length + message) binary string.
    *   These changes are typically imperceptible to the human eye.
    *   A new image (in PNG format) is generated with the embedded message.

2.  **Decoding:**
    *   The (supposedly encoded) image is processed pixel by pixel.
    *   The least significant bit from each color component is extracted.
    *   The application first reads enough bits to reconstruct the message length.
    *   Then, it reads that many subsequent bits to get the binary representation of the secret message.
    *   This binary message is converted back into human-readable text.

## Technologies Used

-   **Next.js:** React framework for server-side rendering and static site generation.
-   **React:** JavaScript library for building user interfaces.
-   **TypeScript:** Superset of JavaScript that adds static typing.
-   **ShadCN UI:** Re-usable UI components.
-   **Tailwind CSS:** Utility-first CSS framework.
-   **Lucide React:** Icon library.
-   **HTML5 Canvas API:** Used for pixel manipulation (reading and writing image data).
-   **TextEncoder/TextDecoder API:** For UTF-8 compliant text-to-binary and binary-to-text conversions.

## Getting Started (Development)

This project is built with Next.js.

1.  **Clone the repository (if applicable).**
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:3000` (or the port specified for Firebase Studio, e.g., 9002).

## Notes & Limitations

-   **PNG Focus:** While you can upload various image types for encoding, the output is always a PNG file. This is crucial because LSB steganography requires a lossless format. Decoding expects a PNG file or an image where LSB data hasn't been corrupted.
-   **Client-Side Processing:** All encoding and decoding operations happen in the user's browser. This can be performance-intensive for very large images or messages.
-   **Capacity Limits:** Each image has a finite capacity to store data. The tool checks for this, but extremely long messages might not fit even in large images.
-   **Error Handling:** If an image uploaded for decoding was not encoded by this tool or if its LSB data is corrupted (e.g., by being re-saved in a lossy format like JPEG), the decoding process might fail or produce garbled results.

---

