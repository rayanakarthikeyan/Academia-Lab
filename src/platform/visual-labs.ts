export const visualStarter = `<h2>Interactive traffic light</h2>
<p>Choose a signal to update the canvas.</p>
<button onclick="draw('red')">Stop</button>
<button onclick="draw('orange')">Wait</button>
<button onclick="draw('green')">Go</button>
<br><canvas id="signal" width="180" height="310"></canvas>
<script>
function draw(active) {
  const ctx = document.getElementById('signal').getContext('2d');
  ctx.fillStyle = '#172033'; ctx.fillRect(30, 10, 120, 290);
  ['red', 'orange', 'green'].forEach((color, i) => {
    ctx.beginPath(); ctx.arc(90, 60 + i * 90, 35, 0, Math.PI * 2);
    ctx.fillStyle = color === active ? color : '#475569'; ctx.fill();
  });
}
draw('red');
</script>`;
