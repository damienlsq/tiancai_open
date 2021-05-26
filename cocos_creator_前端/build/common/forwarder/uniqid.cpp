#include "uniqid.h"

namespace forwarder {

	UniqIDGenerator::UniqIDGenerator() :
		count(0),
        recycleThreshold(100000),
        recycleEnabled(false)
	{
	};

	UniqIDGenerator::~UniqIDGenerator() {
		recycled.clear();
	}

	UniqID UniqIDGenerator::getNewID() noexcept {
		if (recycleEnabled && count > recycleThreshold) {
			if (recycled.size() > 0) {
                auto it = recycled.begin();
				UniqID id = *it;
                recycled.erase(it);
				return id;
			}
		}
		count++;
		return count;
	}
	void UniqIDGenerator::recycleID(UniqID id) noexcept {
        if(!recycleEnabled) {
            return;
        }
		recycled.insert(id);
	}
};
