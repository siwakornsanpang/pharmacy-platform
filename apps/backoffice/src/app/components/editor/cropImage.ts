// src/app/manage/home/cropImage.ts

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // เพื่อป้องกันปัญหา CORS
    image.src = url
  })

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number, y: number, width: number, height: number },
  fileName: string = 'cropped-banner.jpg'
): Promise<File | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return null

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  let mimeType = 'image/jpeg';
  if (fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
  else if (fileName.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
  else if (fileName.toLowerCase().endsWith('.gif')) mimeType = 'image/gif';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null)
        return
      }
      // แปลง Blob กลับเป็น File เพื่อส่งเข้า API ตามระบบเดิม
      const file = new File([blob], fileName, { type: mimeType })
      resolve(file)
    }, mimeType, 1.0) // 1.0 คือคุณภาพสูงสุด
  })
}