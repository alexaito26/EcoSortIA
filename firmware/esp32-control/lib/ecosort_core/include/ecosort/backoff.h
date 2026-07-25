#pragma once

#include <cstdint>

namespace ecosort {

/**
 * Backoff exponencial para reintentos de red.
 *
 * Evita martillar las Edge Functions cuando el WiFi o Supabase estan caidos:
 * base, base*2, base*4, ... hasta un tope. Se reinicia tras un envio correcto.
 */
class Backoff {
 public:
  Backoff(uint32_t baseMs, uint32_t maxMs);

  /** Retardo del siguiente intento y avanza el contador. */
  uint32_t nextDelayMs();

  /** Retardo actual sin avanzar el contador. */
  uint32_t peekDelayMs() const;

  void reset();

  uint32_t attempts() const { return attempts_; }

 private:
  uint32_t baseMs_;
  uint32_t maxMs_;
  uint32_t attempts_ = 0;
};

}  // namespace ecosort
