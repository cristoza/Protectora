# Certificados C2PA de prueba

El grupo `04_c2pa` del corpus se firma con una CA de prueba y un certificado de firma RSA (PS256). `scripts/build_corpus.py` busca aquí `chain.pem` (certificado de firma seguido de la CA) y `signer.key` (llave privada PKCS#8). Si no existen, los genera con `cryptography` la primera vez.

Estos archivos **no se versionan** (`.gitignore`) y no sirven para firmar obras reales: no pertenecen a ninguna lista de confianza.

## Generarlos a mano con openssl

Desde esta carpeta:

```bash
# CA de prueba
openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.pem -days 365 \
  -subj "/CN=Escudo Visual CA de prueba/O=Escudo Visual (prueba)" \
  -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# Certificado de firma, emitido por la CA
openssl req -newkey rsa:2048 -nodes -keyout signer.key -out signer.csr \
  -subj "/CN=Escudo Visual firmante de prueba/O=Escudo Visual (prueba)"
printf "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=emailProtection\nauthorityKeyIdentifier=keyid\nsubjectKeyIdentifier=hash\n" > leaf.ext
openssl x509 -req -in signer.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out signer.pem -days 365 -extfile leaf.ext

# Cadena que usa el firmante: hoja primero, CA después
cat signer.pem ca.pem > chain.pem
```

C2PA exige que el certificado de firma no sea una CA, que tenga `digitalSignature` y un uso extendido admitido (`emailProtection` es uno de ellos). Un certificado autofirmado usado directamente como firmante se rechaza.

## Validez

`c2pa-python` 0.8 no comprueba listas de confianza si no se le cargan, así que con este certificado `read_c2pa` devuelve `valid: true`: la firma y los hashes son correctos. Un lector que sí aplique la lista de confianza de C2PA (por ejemplo, Content Credentials Verify) marcará la firma como no confiable. En el corpus, `valid` significa "íntegro y bien firmado", no "emitido por una entidad reconocida".
