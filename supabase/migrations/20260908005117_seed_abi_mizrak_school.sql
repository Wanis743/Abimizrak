INSERT INTO schools (id, name_ar, name_fr, name_en, code, updated_at)
VALUES ('abi-mizrak', 'ثانوية أبي مزراق المقراني', 'Lycée Abi Mizrak El Mokrani', 'Lycée Abi Mizrak', 'ABI-MIZRAK', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
