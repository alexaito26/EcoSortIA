#include "io/vision_uart.h"

#include <HardwareSerial.h>

#include "config.h"
#include "ecosort/uart_protocol.h"

namespace ecosort {
namespace {
HardwareSerial visionSerial(VISION_UART_PORT);
}

void VisionUart::begin() {
  visionSerial.begin(VISION_UART_BAUD, SERIAL_8N1, PIN_VISION_RX, PIN_VISION_TX);
  buffer_.reserve(kMaxUartLine);
  Serial.printf("[uart] escuchando vision en rx=%d tx=%d\n", PIN_VISION_RX, PIN_VISION_TX);
}

bool VisionUart::poll(VisionResult& out) {
  while (visionSerial.available() > 0) {
    const char c = static_cast<char>(visionSerial.read());

    if (c == '\r') continue;

    if (c != '\n') {
      if (buffer_.length() >= kMaxUartLine) {
        // Linea sin fin: cortar aqui evita agotar la RAM con ruido continuo.
        buffer_.clear();
        ++protocolErrors_;
        continue;
      }
      buffer_ += c;
      continue;
    }

    const String line = buffer_;
    buffer_.clear();
    if (line.length() == 0) continue;

    const VisionResult result = parseVisionLine(std::string(line.c_str()));
    if (!result.valid) {
      ++protocolErrors_;
      Serial.printf("[uart] linea descartada: %.80s\n", line.c_str());
      continue;
    }

    lastMessageMs_ = millis();
    everReceived_ = true;
    out = result;
    return true;
  }

  return false;
}

uint32_t VisionUart::millisSinceLastMessage() const {
  if (!everReceived_) return UINT32_MAX;
  return millis() - lastMessageMs_;
}

}  // namespace ecosort
