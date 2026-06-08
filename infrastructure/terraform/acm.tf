resource "aws_acm_certificate" "main" {
  domain_name               = "api.lunara.app"
  subject_alternative_names = ["admin.lunara.app", "lunara.app"]
  validation_method         = "DNS"

  lifecycle { create_before_destroy = true }
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_acm_certificate.main.domain_validation_options : record.resource_record_name]
}
