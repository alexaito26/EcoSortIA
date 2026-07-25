#pragma once

#include <cstddef>
#include <deque>
#include <string>

namespace ecosort {

/**
 * Cola FIFO de eventos pendientes de enviar (modo offline).
 *
 * Guarda el JSON ya construido, no el evento: asi un reintento envia
 * exactamente el mismo `event_id` y la Edge Function lo reconoce como
 * duplicado en lugar de contarlo dos veces.
 *
 * Al llenarse descarta el evento MAS ANTIGUO: en un clasificador de residuos
 * interesa mas lo que acaba de pasar que lo ocurrido hace horas.
 */
class EventQueue {
 public:
  explicit EventQueue(std::size_t capacity);

  /** Encola un payload. Devuelve false si hubo que descartar el mas antiguo. */
  bool push(const std::string& payload);

  /** Payload mas antiguo. Cadena vacia si la cola esta vacia. */
  const std::string& front() const;

  /** Elimina el payload mas antiguo (tras enviarse con exito). */
  void pop();

  void clear();

  std::size_t size() const { return items_.size(); }
  std::size_t capacity() const { return capacity_; }
  bool empty() const { return items_.empty(); }
  bool full() const { return items_.size() >= capacity_; }

  /** Numero de eventos descartados por desbordamiento desde el arranque. */
  std::size_t droppedCount() const { return dropped_; }

  /**
   * Serializa la cola para persistirla (NVS / LittleFS).
   * Formato: por cada elemento, longitud decimal + '\n' + payload.
   */
  std::string serialize() const;

  /** Restaura desde una cadena de `serialize()`. Ignora datos corruptos. */
  void deserialize(const std::string& blob);

 private:
  std::size_t capacity_;
  std::size_t dropped_ = 0;
  std::deque<std::string> items_;
};

}  // namespace ecosort
