/* ====================================================================
 * Copyright (c) 2008 The OpenSSL Project. All rights reserved.
 *
 * Rights for redistribution and usage in source and binary
 * forms are granted according to the OpenSSL license.
 */
#ifndef AESCTR_H
#define AESCTR_H

#include "aes.h"

void AES_encrypt(const unsigned char *in, unsigned char *out,
	const AES_KEY *key);
void AES_decrypt(const unsigned char *in, unsigned char *out,
	const AES_KEY *key);

void AES_ctr128_encrypt(const unsigned char *in, unsigned char *out,
	size_t length, const AES_KEY *key,
	unsigned char ivec[AES_BLOCK_SIZE],
	unsigned char ecount_buf[AES_BLOCK_SIZE],
	unsigned int *num);



#endif