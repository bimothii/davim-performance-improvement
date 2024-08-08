onmessage = function (event) {
  console.log("Received message from the main thread:", event.data);

  // Computations go here
  let result = event.data;

  for (let i = 0; i < 1000000000; i++) result++;

  postMessage(result);
};
