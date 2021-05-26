#ifndef UNIQID_H
#define UNIQID_H
#include "base.h"

namespace forwarder {

	typedef unsigned int UniqID;

	class UniqIDGenerator
	{
	public:
		UniqIDGenerator();
		~UniqIDGenerator();
		UniqID getNewID() noexcept;
        void setRecycleThreshold(int threshold) noexcept {
            recycleThreshold = threshold;
        }
        void setRecycleEnabled(bool b) noexcept {
            recycleEnabled = b;
        }
        bool isRecycleEnabled() noexcept {
            return recycleEnabled;
        }
		void recycleID(UniqID id) noexcept;
		inline size_t getCount() const noexcept {
			return count;
		}
		inline size_t getRecycledLength() const noexcept {
			return recycled.size();
		}
    private:
        std::set<UniqID> recycled;
        UniqID count;
        int recycleThreshold;
        bool recycleEnabled;
	};
};

#endif
