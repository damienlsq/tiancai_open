/* ====================================================================
 * Copyright (c) 2008 The OpenSSL Project. All rights reserved.
 *
 * Rights for redistribution and usage in source and binary
 * forms are granted according to the OpenSSL license.
 */
#ifndef AES_H
#define AES_H

#include <stddef.h>
#include <cstdint>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef unsigned char u8;
typedef unsigned int u32;

/*
	from crypto/aes/aes_locl.h
*/

#define GETU32(pt) (((u32)(pt)[0] << 24) ^ ((u32)(pt)[1] << 16) ^ ((u32)(pt)[2] << 8) ^ ((u32)(pt)[3]))
#define PUTU32(ct, st)              \
    {                               \
	(ct)[0] = (u8)((st) >> 24); \
	(ct)[1] = (u8)((st) >> 16); \
	(ct)[2] = (u8)((st) >> 8);  \
	(ct)[3] = (u8)(st);         \
    }

/*
	from crypto/modes/modes.h
*/

typedef void (*block128_f)(const unsigned char in[16],
			   unsigned char out[16], const void *key);

typedef void (*ctr128_f)(const unsigned char *in, unsigned char *out,
			 size_t blocks, const void *key,
			 const unsigned char ivec[16]);

void CRYPTO_ctr128_encrypt(const unsigned char *in, unsigned char *out,
			   size_t len, const void *key,
			   unsigned char ivec[16],
			   unsigned char ecount_buf[16], unsigned int *num,
			   block128_f block);

void CRYPTO_ctr128_encrypt_ctr32(const unsigned char *in, unsigned char *out,
				 size_t len, const void *key,
				 unsigned char ivec[16],
				 unsigned char ecount_buf[16],
				 unsigned int *num, ctr128_f ctr);

/* 
		from crypto/aes/aes.h 
*/

#define AES_ENCRYPT 1
#define AES_DECRYPT 0

/*
* Because array size can't be a const in C, the following two are macros.
* Both sizes are in bytes.
*/
#define AES_MAXNR 14
#define AES_BLOCK_SIZE 16

/* This should be a hidden type, but EVP requires that the size be known */
struct aes_key_st
{
#ifdef AES_LONG
    unsigned long rd_key[4 * (AES_MAXNR + 1)];
#else
    unsigned int rd_key[4 * (AES_MAXNR + 1)];
#endif
    int rounds;
};
typedef struct aes_key_st AES_KEY;

void AES_encrypt(const unsigned char *in, unsigned char *out,
		 const AES_KEY *key);
void AES_decrypt(const unsigned char *in, unsigned char *out,
		 const AES_KEY *key);

int AES_set_encrypt_key(const unsigned char *userKey, const int bits,
	AES_KEY *key);
int AES_set_decrypt_key(const unsigned char *userKey, const int bits,
	AES_KEY *key);



#ifdef __cplusplus
}
#endif

#endif