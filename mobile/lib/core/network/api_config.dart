/// Configuration réseau — pointe vers le serveur de test réel (§ déploiement).
///
/// Le vrai client HTTP/Dio complet (intercepteurs JWT, refresh token, retry)
/// arrive au Module 6 ; ce fichier pose la base URL utilisée dès maintenant
/// pour les tests réels agent ↔ serveur déployé.
class ApiConfig {
  /// Serveur de test déployé (voir docker-compose sur 72.62.71.97).
  /// Pour repointer vers un backend local pendant le dev : `flutter run
  /// --dart-define=API_BASE_URL=http://VOTRE_IP_LOCALE:4000/api`.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://72.62.71.97:4600/api',
  );
}
