#include <limits>
#include <stdexcept>

int checked_sum(int a, int b) {
  using stored_type = decltype(a);
  if (a < 0 || b < 0 || b > std::numeric_limits<stored_type>::max() - a)
    throw std::out_of_range("size overflow");
  return static_cast<stored_type>(a + b);
}
