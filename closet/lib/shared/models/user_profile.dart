class UserProfile {
  final String id;
  final String email;
  final String? name;
  final String? imageUrl;
  final String plan; // 'free'|'pro'

  const UserProfile({
    required this.id,
    required this.email,
    this.name,
    this.imageUrl,
    required this.plan,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      imageUrl: json['image_url'] as String?,
      plan: json['plan'] as String? ?? 'free',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'image_url': imageUrl,
        'plan': plan,
      };

  bool get isPro => plan == 'pro';
}
