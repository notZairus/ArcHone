// badCodeExample.js

function a(a1, b1, c1, d1, e1) {
  var x = 0;
  var y = 0;
  var z = [];
  var temp = 0;

  for (var i = 0; i < a1.length; i++) {
    if (a1[i] !== null) {
      if (typeof a1[i] === "number") {
        if (a1[i] > 0) {
          if (a1[i] % 2 === 0) {
            if (a1[i] > 10) {
              x += a1[i];
            } else {
              y += a1[i];
            }
          } else {
            if (a1[i] < 5) {
              z.push(a1[i] * 2);
            } else {
              z.push(a1[i] * 3);
            }
          }
        } else {
          if (a1[i] === 0) {
            temp += 1;
          } else {
            temp -= 1;
          }
        }
      } else {
        if (typeof a1[i] === "string") {
          if (a1[i].length > 3) {
            if (a1[i].includes("a")) {
              console.log("string with a:", a1[i]);
            } else {
              console.log("string:", a1[i]);
            }
          } else {
            console.log("short string:", a1[i]);
          }
        } else {
          console.log("unknown type");
        }
      }
    } else {
      console.log("null value");
    }
  }

  for (var j = 0; j < z.length; j++) {
    for (var k = 0; k < z.length; k++) {
      if (z[j] > z[k]) {
        var t = z[j];
        z[j] = z[k];
        z[k] = t;
      }
    }
  }

  if (b1) {
    if (c1) {
      if (d1) {
        if (e1) {
          console.log("all flags true");
        } else {
          console.log("e1 false");
        }
      } else {
        console.log("d1 false");
      }
    } else {
      console.log("c1 false");
    }
  } else {
    console.log("b1 false");
  }

  console.log("x:", x);
  console.log("y:", y);
  console.log("z:", z);
  console.log("temp:", temp);

  return {
    x: x,
    y: y,
    z: z,
    temp: temp,
  };
}

module.exports = { a };
