/// Modèle Fiche — les sections métier (deratExterne/deratInterne/
/// desinsectisation) restent en `Map<String, dynamic>` brut : leur structure
/// profondément imbriquée (zones -> postes -> cases) est éditée directement
/// comme JSON par l'écran fiche plutôt que reformée en classes Dart figées,
/// pour rester ligne à ligne avec le contrat API (§6.4) sans double
/// maintenance de mapping.
class FicheModel {
  final String id;
  final String clientId;
  final String siteId;
  final String status;
  final DateTime interventionDate;
  final double? ocrConfidence;
  final List<String> scanImageUrls;
  final Map<String, dynamic>? deratExterne;
  final Map<String, dynamic>? deratInterne;
  final Map<String, dynamic>? desinsectisation;

  FicheModel({
    required this.id,
    required this.clientId,
    required this.siteId,
    required this.status,
    required this.interventionDate,
    this.ocrConfidence,
    this.scanImageUrls = const [],
    this.deratExterne,
    this.deratInterne,
    this.desinsectisation,
  });

  factory FicheModel.fromJson(Map<String, dynamic> json) => FicheModel(
        id: json['_id'] as String,
        clientId: json['clientId'] as String,
        siteId: json['siteId'] as String,
        status: json['status'] as String,
        interventionDate: DateTime.parse(json['interventionDate'] as String),
        ocrConfidence: (json['ocrConfidence'] as num?)?.toDouble(),
        scanImageUrls: (json['scanImageUrls'] as List?)?.cast<String>() ?? const [],
        deratExterne: json['deratExterne'] as Map<String, dynamic>?,
        deratInterne: json['deratInterne'] as Map<String, dynamic>?,
        desinsectisation: json['desinsectisation'] as Map<String, dynamic>?,
      );

  bool get isEditable => status == 'DRAFT';
}

class FicheSummary {
  final String id;
  final String status;
  final DateTime interventionDate;
  final String clientId;

  FicheSummary({required this.id, required this.status, required this.interventionDate, required this.clientId});

  factory FicheSummary.fromJson(Map<String, dynamic> json) => FicheSummary(
        id: json['_id'] as String,
        status: json['status'] as String,
        interventionDate: DateTime.parse(json['interventionDate'] as String),
        clientId: json['clientId'] as String,
      );
}
