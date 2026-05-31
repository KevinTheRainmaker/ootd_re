class OotdItem {
  final String id;
  final String ootdId;
  final String category; // 'top'|'bottom'|'outer'|'shoes'|'bag'|'accessory'
  final String? brand;
  final String? productName;
  final String? styleDescription;
  final String? color;
  final int orderIdx;

  const OotdItem({
    required this.id,
    required this.ootdId,
    required this.category,
    this.brand,
    this.productName,
    this.styleDescription,
    this.color,
    required this.orderIdx,
  });

  factory OotdItem.fromJson(Map<String, dynamic> json) {
    return OotdItem(
      id: json['id'] as String,
      ootdId: json['ootd_id'] as String,
      category: json['category'] as String,
      brand: json['brand'] as String?,
      productName: json['product_name'] as String?,
      styleDescription: json['style_description'] as String?,
      color: json['color'] as String?,
      orderIdx: json['order_idx'] as int,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'ootd_id': ootdId,
        'category': category,
        'brand': brand,
        'product_name': productName,
        'style_description': styleDescription,
        'color': color,
        'order_idx': orderIdx,
      };

  OotdItem copyWith({
    String? id,
    String? ootdId,
    String? category,
    String? brand,
    String? productName,
    String? styleDescription,
    String? color,
    int? orderIdx,
  }) {
    return OotdItem(
      id: id ?? this.id,
      ootdId: ootdId ?? this.ootdId,
      category: category ?? this.category,
      brand: brand ?? this.brand,
      productName: productName ?? this.productName,
      styleDescription: styleDescription ?? this.styleDescription,
      color: color ?? this.color,
      orderIdx: orderIdx ?? this.orderIdx,
    );
  }
}
