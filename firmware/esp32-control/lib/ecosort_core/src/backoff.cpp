#include "ecosort/backoff.h"

namespace ecosort {

Backoff::Backoff(uint32_t baseMs, uint32_t maxMs)
    : baseMs_(baseMs == 0 ? 1 : baseMs), maxMs_(maxMs < baseMs ? baseMs : maxMs) {}

uint32_t Backoff::peekDelayMs() const {
  uint32_t delay = baseMs_;
  for (uint32_t i = 0; i < attempts_; ++i) {
    // Duplica hasta el tope, cuidando el desbordamiento de 32 bits.
    if (delay > maxMs_ / 2) return maxMs_;
    delay *= 2;
  }
  return delay > maxMs_ ? maxMs_ : delay;
}

uint32_t Backoff::nextDelayMs() {
  const uint32_t delay = peekDelayMs();
  if (delay < maxMs_) ++attempts_;
  return delay;
}

void Backoff::reset() { attempts_ = 0; }

}  // namespace ecosort
