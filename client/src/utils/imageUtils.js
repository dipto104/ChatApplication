/**
 * Compresses an image file using HTML5 Canvas.
 * @param {File} file - The original image file.
 * @param {Object} options - Compression options.
 * @param {number} options.maxSizeMB - Maximum file size in MB.
 * @param {number} options.maxWidthOrHeight - Maximum dimension in pixels.
 * @returns {Promise<File>} - A promise that resolves to the compressed File object.
 */
export const compressImage = (file, options = { maxSizeMB: 1, maxWidthOrHeight: 1200 }) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Resize if needed
                if (width > height) {
                    if (width > options.maxWidthOrHeight) {
                        height *= options.maxWidthOrHeight / width;
                        width = options.maxWidthOrHeight;
                    }
                } else {
                    if (height > options.maxWidthOrHeight) {
                        width *= options.maxWidthOrHeight / height;
                        height = options.maxWidthOrHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Canvas to Blob conversion failed"));
                            return;
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    "image/jpeg",
                    0.7 // Quality (0.0 to 1.0)
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
