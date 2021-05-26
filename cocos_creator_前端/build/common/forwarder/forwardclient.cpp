#include "forwardclient.h"


namespace forwarder {
	void ForwardClientENet::setPeerTimeout(enet_uint32 timeoutLimit, enet_uint32 timeoutMinimum, enet_uint32 timeoutMaximum) {
		enet_peer_timeout(peer, timeoutLimit, timeoutMinimum, timeoutMaximum);
	}

	void ForwardClientENet::setPing(enet_uint32 pingInterval) {
		enet_peer_ping_interval(peer, pingInterval);
	}
};