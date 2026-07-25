#include "ecosort/model.h"

#include <cstring>

namespace ecosort {

const char* toString(Material material) {
  switch (material) {
    case Material::Plastic:
      return "plastic";
    case Material::Glass:
      return "glass";
    case Material::Reject:
      return "reject";
    case Material::Unknown:
    default:
      return "unknown";
  }
}

const char* toString(EventType type) {
  switch (type) {
    case EventType::ClassificationCompleted:
      return "classification_completed";
    case EventType::ClassificationRejected:
      return "classification_rejected";
    case EventType::RoutingError:
      return "routing_error";
    case EventType::SensorError:
      return "sensor_error";
    case EventType::SystemError:
    default:
      return "system_error";
  }
}

Material materialFromString(const char* text) {
  if (text == nullptr) return Material::Unknown;
  if (std::strcmp(text, "plastic") == 0) return Material::Plastic;
  if (std::strcmp(text, "glass") == 0) return Material::Glass;
  if (std::strcmp(text, "reject") == 0) return Material::Reject;
  return Material::Unknown;
}

}  // namespace ecosort
