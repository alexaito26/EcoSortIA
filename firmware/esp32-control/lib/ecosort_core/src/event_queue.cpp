#include "ecosort/event_queue.h"

#include <cstdlib>

namespace ecosort {
namespace {
const std::string kEmpty;
}

EventQueue::EventQueue(std::size_t capacity) : capacity_(capacity == 0 ? 1 : capacity) {}

bool EventQueue::push(const std::string& payload) {
  bool droppedOldest = false;
  while (items_.size() >= capacity_) {
    items_.pop_front();
    ++dropped_;
    droppedOldest = true;
  }
  items_.push_back(payload);
  return !droppedOldest;
}

const std::string& EventQueue::front() const {
  if (items_.empty()) return kEmpty;
  return items_.front();
}

void EventQueue::pop() {
  if (!items_.empty()) items_.pop_front();
}

void EventQueue::clear() { items_.clear(); }

std::string EventQueue::serialize() const {
  std::string blob;
  for (const std::string& item : items_) {
    blob += std::to_string(item.size());
    blob += '\n';
    blob += item;
  }
  return blob;
}

void EventQueue::deserialize(const std::string& blob) {
  items_.clear();

  std::size_t cursor = 0;
  while (cursor < blob.size()) {
    const std::size_t newline = blob.find('\n', cursor);
    if (newline == std::string::npos) break;

    const std::string lengthText = blob.substr(cursor, newline - cursor);
    if (lengthText.empty()) break;

    char* end = nullptr;
    const long length = std::strtol(lengthText.c_str(), &end, 10);
    // Longitud no numerica o que excede el blob: datos corruptos, se corta.
    if (end == nullptr || *end != '\0' || length < 0) break;

    const std::size_t start = newline + 1;
    const std::size_t size = static_cast<std::size_t>(length);
    if (start + size > blob.size()) break;

    if (items_.size() < capacity_) {
      items_.push_back(blob.substr(start, size));
    }
    cursor = start + size;
  }
}

}  // namespace ecosort
