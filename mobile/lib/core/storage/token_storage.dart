import 'package:hive_flutter/hive_flutter.dart';

/// Persistance des tokens JWT — Hive (déjà utilisé pour le cache offline,
/// §4/§11). Une vraie build de prod gagnerait à chiffrer cette box ou à
/// utiliser `flutter_secure_storage` (Keychain/Keystore) ; on reste sur
/// Hive ici pour ne pas ajouter de dépendance supplémentaire au squelette.
class TokenStorage {
  static const _boxName = 'smhit_auth';
  static const _accessKey = 'accessToken';
  static const _refreshKey = 'refreshToken';

  static Future<Box> _box() => Hive.openBox(_boxName);

  static Future<void> save({required String accessToken, required String refreshToken}) async {
    final box = await _box();
    await box.put(_accessKey, accessToken);
    await box.put(_refreshKey, refreshToken);
  }

  static Future<String?> getAccessToken() async => (await _box()).get(_accessKey) as String?;
  static Future<String?> getRefreshToken() async => (await _box()).get(_refreshKey) as String?;

  static Future<void> clear() async {
    final box = await _box();
    await box.delete(_accessKey);
    await box.delete(_refreshKey);
  }
}
