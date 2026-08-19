#include <filesystem>
#include <stdexcept>
#include <string>

std::filesystem::path resolve_under(const std::filesystem::path &base_dir,
                                    const std::string &user_supplied_name) {
  const std::filesystem::path name(user_supplied_name);
  for (const auto &component : name)
    if (component == "..")
      throw std::invalid_argument("path contains a \"..\" component");
  const auto base = std::filesystem::weakly_canonical(base_dir);
  const auto candidate = std::filesystem::weakly_canonical(base / name);
  const auto relative = candidate.lexically_relative(base);
  if (relative.empty() || *relative.begin() == "..")
    throw std::invalid_argument("path escapes base directory");
  return candidate;
}
