class ClientModel {
  final String id;
  final String name;

  ClientModel({required this.id, required this.name});

  factory ClientModel.fromJson(Map<String, dynamic> json) =>
      ClientModel(id: json['_id'] as String, name: json['name'] as String);
}

class SiteModel {
  final String id;
  final String clientId;
  final String name;

  SiteModel({required this.id, required this.clientId, required this.name});

  factory SiteModel.fromJson(Map<String, dynamic> json) => SiteModel(
        id: json['_id'] as String,
        clientId: json['clientId'] as String,
        name: json['name'] as String,
      );
}
