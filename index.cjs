const sharp = require('sharp')

// sharp('img.png')
//     .raw()
//     .toBuffer((err, data, info) => {
//         if(err) throw err
//         else {
//             const pixels = []
//             const {width, height, channels} = info
//             let targetX, targetY;
//             const buffer = Buffer.alloc(width * height * channels)
//             for (let index = 0; index < width * height * channels; index += channels) {
//                     pixels.push({
//                         r: data[index],
//                         g: data[index + 1],
//                         b: data[index + 2],
//                         alpha: channels == 4 ? data[index + 3] : 255
//                     });
//                     buffer[index] = data[index]
//                     buffer[index + 1] = data[index + 1]
//                     buffer[index + 2] = data[index + 2]
//                     buffer[index + 3] = channels == 4 ? data[index + 3] : 255
//             }
//             const coord = pixels.find((item) => item.r == 1 && item.g == 28 && item.b == 14)
//             sharp(buffer, {raw: {width, height, channels}})
//             .scan(0, 0, width, height, (x, y, idx) => {
//                 const r = data[idx];
//                 const g = data[idx + 1];
//                 const b = data[idx + 2];
      
//                 // Вычисляем расстояние между искомым цветом и текущим пикселем
//                 const currentDistance = Math.sqrt(
//                   (targetColor[0] - r) ** 2 + (targetColor[1] - g) ** 2 + (targetColor[2] - b) ** 2
//                 );
      
//                 // Если расстояние меньше, чем текущее минимальное расстояние,
//                 // обновляем координаты и минимальное расстояние
//                 if (currentDistance < distance) {
//                   targetX = x;
//                   targetY = y;
//                   distance = currentDistance;
//                 }
//               })
//               .then(() => {
//                 console.log(`Ближайший пиксель к искомому цвету (${targetColor}) находится в точке (${targetX},${targetY})`);
//               })
//               .catch((err) => {
//                 console.error(err);
//               });
//         }
//     })

sharp('img.png')
  .toBuffer()
  .then((data) => {
    const all = []
    const pixels = sharp(data)
      .metadata()
      .then((metadata) => {
        return sharp(data)
          .raw()
          .toBuffer({ resolveWithObject: true }) // Добавлено использование resolveWithObject
          .then(({ data, info }) => {
            const { width, height } = info;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 3;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                all.push({x, y, r, g, b})
                // console.log(`Pixel at (${x}, ${y}): RGB(${r}, ${g}, ${b})`);
              }
            }
            console.log(all.find((item) => {
                if(item.r == 3 && item.g == 45 && item.b == 22) return true
                return false
            }))
          });
      });
    return pixels;
  })
  .catch((err) => {
    console.log(err);
  });
