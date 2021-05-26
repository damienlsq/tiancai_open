#include "forwardpacket.h"


namespace forwarder {
    size_t ForwardPacket::getDataLength() const {
        return length - getHeader()->getHeaderLength();
    }
};
